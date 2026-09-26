/**
 * 기존 학부모 로그인 화면
 * 전화번호 입력 → OTP 발송 → 인증 → enrollment 확인 → /main
 *
 * - enrollment가 있으면 바로 메인으로
 * - 없으면 초대받은 보호자인지 확인(linkGuardianByPhone) 후 자동 연결
 * - 그래도 없으면 "등록코드가 필요합니다" 안내 후 온보딩으로 돌아감
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
import { router } from 'expo-router';
import { signInWithPhoneNumber } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { collection, query, where, getDocs } from '@react-native-firebase/firestore';
import { httpsCallable } from '@react-native-firebase/functions';
import { auth, db, functions } from '../../firebase';
import { otpErrorMessage, smsErrorMessage } from '../../lib/errors';

function toE164Korea(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('82')) return '+' + digits;
  if (digits.startsWith('0')) return '+82' + digits.slice(1);
  return '+82' + digits;
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [rawPhone, setRawPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const confirmRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phone = rawPhone.replace(/\D/g, '');
  const isPhoneReady = phone.length === 11;

  // 카운트다운
  useEffect(() => {
    return () => clearInterval(timerRef.current!);
  }, []);

  function startCountdown() {
    setCountdown(60);
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function sendOtp() {
    setSending(true);
    try {
      const e164 = toE164Korea(phone);
      const confirmation = await signInWithPhoneNumber(auth, e164);
      confirmRef.current = confirmation;
      setStep('otp');
      startCountdown();
    } catch (e) {
      Alert.alert('SMS 발송 실패', smsErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setOtp('');
    await sendOtp();
  }

  async function handleConfirm() {
    if (otp.length !== 6 || !confirmRef.current) return;
    setLoading(true);
    try {
      // 1) OTP 인증
      const cred = await confirmRef.current.confirm(otp);
      const uid = cred?.user?.uid;

      if (!uid) throw new Error('uid 없음');

      // 2) enrollment 존재 여부 확인
      const hasEnrollment = async () =>
        !(await getDocs(query(collection(db, 'guardianLinks'), where('guardianUid', '==', uid)))).empty;

      let enrolled = await hasEnrollment();

      // 2-1) 초대받은 보호자(addGuardianPhone)라면 여기서 자동 연결
      //      예전에는 온보딩 OTP 에서만 호출해서, 초대받은 보호자가 로그인 화면으로 들어오면
      //      "등록된 자녀가 없습니다" 로 막혔다. 초대 안내 문구("로그인하면 자동으로 연결")와 맞춘다.
      if (!enrolled) {
        try {
          const res = await httpsCallable(functions, 'linkGuardianByPhone')({});
          const linked = (res.data as { linked?: string[] } | null)?.linked ?? [];
          if (linked.length > 0) enrolled = await hasEnrollment();
        } catch {
          // 초대 내역 없음 등 — 아래 안내로 진행
        }
      }

      if (!enrolled) {
        // 등록된 자녀 없음 → 안내 후 온보딩으로
        await auth.signOut();
        Alert.alert(
          '등록된 자녀가 없습니다',
          '아직 등록코드로 자녀를 등록하지 않으셨습니다.\n등록코드를 입력해 자녀를 먼저 등록해주세요.',
          [
            {
              text: '등록코드 입력',
              onPress: () => router.replace('/onboarding'),
            },
          ],
        );
        return;
      }

      // 3) enrollment 있음 → 메인으로
      router.replace('/main');
    } catch (e) {
      Alert.alert('인증 실패', otpErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const maskedPhone =
    phone.length >= 9
      ? phone.slice(0, 3) + '-****-' + phone.slice(-4)
      : formatPhone(rawPhone);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* 뒤로가기 */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (step === 'otp') { setStep('phone'); setOtp(''); }
            else router.back();
          }}
        >
          <Text style={styles.backText}>← 이전</Text>
        </TouchableOpacity>

        {/* 로고 */}
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>TC</Text>
          </View>
        </View>

        {step === 'phone' ? (
          /* ── 전화번호 입력 단계 ── */
          <>
            <Text style={styles.title}>전화번호로 로그인</Text>
            <Text style={styles.desc}>
              등록 시 사용한 보호자 전화번호를 입력해주세요.
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>보호자 전화번호</Text>
              <TextInput
                style={[styles.input, isPhoneReady && styles.inputReady]}
                placeholder="010-0000-0000"
                placeholderTextColor="#9ca3af"
                value={formatPhone(rawPhone)}
                onChangeText={(t) => setRawPhone(t.replace(/\D/g, '').slice(0, 11))}
                keyboardType="number-pad"
                maxLength={13}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.button, (!isPhoneReady || sending) && styles.buttonDisabled]}
              onPress={sendOtp}
              disabled={!isPhoneReady || sending}
            >
              {sending ? (
                <ActivityIndicator color="#0c0e13" />
              ) : (
                <Text style={styles.buttonText}>인증번호 받기</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => router.replace('/onboarding')}
            >
              <Text style={styles.registerLinkText}>
                처음 등록하시나요?{' '}
                <Text style={styles.registerLinkBold}>등록코드 입력</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          /* ── OTP 입력 단계 ── */
          <>
            <Text style={styles.title}>인증번호 입력</Text>
            <Text style={styles.desc}>
              <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
              {'\n'}으로 발송된 6자리 인증번호를 입력해주세요.
            </Text>

            <View style={styles.otpWrap}>
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
            </View>

            {/* 재발송 */}
            <TouchableOpacity
              onPress={handleResend}
              disabled={countdown > 0 || sending}
            >
              <Text style={[styles.resend, countdown > 0 && styles.resendDisabled]}>
                {sending
                  ? '재발송 중…'
                  : countdown > 0
                  ? `재발송 (${countdown}초 후)`
                  : '인증번호 재발송'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, (otp.length !== 6 || loading) && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={otp.length !== 6 || loading}
            >
              {loading ? (
                <ActivityIndicator color="#0c0e13" />
              ) : (
                <Text style={styles.buttonText}>로그인</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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

  logoRow: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#d4b06a',
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: '#0c0e13', fontSize: 22, fontWeight: '800', letterSpacing: -1 },

  title: {
    fontSize: 26, fontWeight: '700', color: '#f2f2f0', marginBottom: 10,
  },
  desc: {
    fontSize: 16, color: '#9aa0ab', lineHeight: 26, marginBottom: 36,
  },
  phoneHighlight: { color: '#f2f2f0', fontWeight: '600' },

  field: { marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#d4d7dd', marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: '#262b36',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 20, color: '#f2f2f0', letterSpacing: 1,
    backgroundColor: '#1e232d',
  },
  inputReady: { borderColor: '#d4b06a', backgroundColor: '#1e232d' },

  otpWrap: { alignItems: 'center', marginBottom: 24 },
  otpInput: {
    fontSize: 36, fontWeight: '700', letterSpacing: 12,
    color: '#f2f2f0',
    borderBottomWidth: 2, borderBottomColor: '#d4b06a',
    paddingBottom: 8, textAlign: 'center', width: 220,
  },

  resend: {
    fontSize: 16, color: '#d4b06a', textAlign: 'center',
    marginBottom: 36, textDecorationLine: 'underline',
  },
  resendDisabled: { color: '#9aa0ab', textDecorationLine: 'none' },

  button: {
    backgroundColor: '#d4b06a', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  buttonDisabled: { backgroundColor: '#343a47' },
  buttonText: { color: '#0c0e13', fontSize: 17, fontWeight: '700' },

  registerLink: { paddingVertical: 8, alignItems: 'center' },
  registerLinkText: { fontSize: 16, color: '#9aa0ab' },
  registerLinkBold: { color: '#d4b06a', fontWeight: '700' },
});
