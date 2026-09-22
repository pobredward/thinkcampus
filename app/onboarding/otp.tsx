/**
 * 온보딩 Step 3 — 전화 OTP 인증
 * 인증 성공 시 메인 화면으로 이동
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { signInWithPhoneNumber, signInWithCustomToken } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { httpsCallable } from '@react-native-firebase/functions';
import { auth, functions } from '../../firebase';
import { saveGuardianName } from '../../hooks/useGuardianName';
import { otpErrorMessage, smsErrorMessage } from '../../lib/errors';

function toE164Korea(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('82')) return '+' + digits;
  if (digits.startsWith('0')) return '+82' + digits.slice(1);
  return '+82' + digits;
}

export default function OnboardingOtp() {
  const { phone, customToken, guardianName } = useLocalSearchParams<{
    phone: string;
    customToken: string;
    guardianName?: string;
  }>();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(60);
  const confirmRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const maskedPhone = phone
    ? phone.slice(0, 3) + '-****-' + phone.slice(-4)
    : '';

  // 자동 OTP 발송
  useEffect(() => {
    sendOtp();
  }, []);

  // 카운트다운
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  async function sendOtp() {
    setSending(true);
    try {
      const e164 = toE164Korea(phone);
      const confirmation = await signInWithPhoneNumber(auth, e164);
      confirmRef.current = confirmation;
    } catch (e) {
      Alert.alert('SMS 발송 실패', smsErrorMessage(e), [
        { text: '이전으로', onPress: () => router.back() },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setOtp('');
    setResendCountdown(60);
    timerRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    await sendOtp();
  }

  async function handleConfirm() {
    if (otp.length !== 6) {
      Alert.alert('확인', '6자리 인증번호를 입력해주세요.');
      return;
    }
    if (!confirmRef.current) return;

    setLoading(true);
    try {
      // 1) OTP 인증 — 전화번호 소유권 확인
      await confirmRef.current.confirm(otp);

      // 2) customToken이 있으면 해당 uid로 재로그인
      //    redeemCode가 생성한 uid에 enrollment가 연결되어 있으므로
      //    OTP uid 대신 customToken uid를 사용해야 데이터가 보임
      if (customToken) {
        await signInWithCustomToken(auth, customToken);
      }

      // 2-1) 가입 화면에서 받은 보호자 이름을 계정 표시 이름으로 (실패해도 로그인은 계속 — 홈에서 다시 물어봄)
      if (guardianName) {
        await saveGuardianName(guardianName).catch(() => undefined);
      }

      // 3) 초대받은 보호자인 경우 자동 연결 (allowedGuardianPhoneHashes 기반)
      try {
        const linkFn = httpsCallable(functions, 'linkGuardianByPhone');
        await linkFn({});
      } catch {
        // 초대 없이 등록한 경우 무시
      }

      router.replace('/main');
    } catch (e) {
      Alert.alert('인증 실패', otpErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← 이전</Text>
        </TouchableOpacity>

        {/* 진행 단계 */}
        <View style={styles.stepRow}>
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
        </View>

        <Text style={styles.title}>인증번호 입력</Text>
        <Text style={styles.desc}>
          <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
          {'\n'}으로 발송된 6자리 인증번호를 입력해주세요.
        </Text>

        {/* OTP 입력 */}
        <View style={styles.otpWrap}>
          {sending ? (
            <View style={styles.sendingBox}>
              <ActivityIndicator color="#d4b06a" />
              <Text style={styles.sendingText}>인증번호 발송 중…</Text>
            </View>
          ) : (
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#d1d5db"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          )}
        </View>

        {/* 재발송 */}
        <TouchableOpacity
          onPress={handleResend}
          disabled={resendCountdown > 0 || sending}
        >
          <Text style={[styles.resend, resendCountdown > 0 && styles.resendDisabled]}>
            {resendCountdown > 0
              ? `재발송 (${resendCountdown}초 후)`
              : '인증번호 재발송'}
          </Text>
        </TouchableOpacity>

        {/* 확인 버튼 */}
        <TouchableOpacity
          style={[
            styles.button,
            (otp.length !== 6 || loading || sending) && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={otp.length !== 6 || loading || sending}
        >
          {loading ? (
            <ActivityIndicator color="#0c0e13" />
          ) : (
            <Text style={styles.buttonText}>인증 완료</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161a22',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#d4b06a', fontWeight: '500' },
  stepRow: { flexDirection: 'row', gap: 6, marginBottom: 32 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#343a47' },
  stepDotActive: { backgroundColor: '#d4b06a', width: 24 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f2f2f0',
    marginBottom: 12,
  },
  desc: {
    fontSize: 16,
    color: '#9aa0ab',
    lineHeight: 26,
    marginBottom: 40,
  },
  phoneHighlight: { color: '#f2f2f0', fontWeight: '600' },
  otpWrap: { alignItems: 'center', marginBottom: 24 },
  sendingBox: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sendingText: { color: '#9aa0ab', fontSize: 16 },
  otpInput: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 12,
    color: '#f2f2f0',
    borderBottomWidth: 2,
    borderBottomColor: '#d4b06a',
    paddingBottom: 8,
    textAlign: 'center',
    width: 220,
  },
  resend: {
    fontSize: 16,
    color: '#d4b06a',
    textAlign: 'center',
    marginBottom: 40,
    textDecorationLine: 'underline',
  },
  resendDisabled: { color: '#9aa0ab', textDecorationLine: 'none' },
  button: {
    backgroundColor: '#d4b06a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#343a47' },
  buttonText: { color: '#0c0e13', fontSize: 17, fontWeight: '700' },
});
