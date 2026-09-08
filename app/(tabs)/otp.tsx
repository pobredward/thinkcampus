/**
 * Tab B: 휴대폰 OTP (Firebase Phone Auth – 네이티브 SMS)
 *
 * @react-native-firebase/auth 사용.
 * reCAPTCHA / expo-firebase-recaptcha 없음.
 *
 * 타임스탬프 표시:
 *   - 인증번호 요청 시각
 *   - OTP 입력 완료 시각 (체감 대기시간 계산 가능)
 *
 * 에러 코드 그대로 노출 (auth/too-many-requests 등)
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// 한국 번호를 E.164로 변환 (01012345678 → +821012345678)
function toE164Korea(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('010') || digits.startsWith('011')) {
    return '+82' + digits.slice(1);
  }
  if (digits.startsWith('+82')) return digits;
  return '+82' + digits;
}

type OtpStep = 'phone' | 'code' | 'done';

export default function OtpScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<OtpStep>('phone');

  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  // 성공 결과
  const [uid, setUid] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // 타임스탬프
  const sendTs = useRef<Date | null>(null);
  const [sendTsStr, setSendTsStr] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);

  // Firebase confirmation
  const confirmRef = useRef<FirebaseAuthTypes.ConfirmationResult | null>(null);

  function appendLog(msg: string) {
    const ts = new Date().toLocaleTimeString('ko-KR', { hour12: false });
    setLog((prev) => [`[${ts}] ${msg}`, ...prev]);
  }

  // ── 인증번호 발송 ────────────────────────────
  async function handleSend() {
    const e164 = toE164Korea(phone);
    setLoading(true);
    const now = new Date();
    sendTs.current = now;
    setSendTsStr(now.toLocaleTimeString('ko-KR', { hour12: false }));
    appendLog(`→ verifyPhoneNumber 요청: ${e164}`);

    try {
      const confirmation = await auth().signInWithPhoneNumber(e164);
      confirmRef.current = confirmation;
      setStep('code');
      appendLog(`✅ SMS 발송 완료 – 코드 입력 대기 중`);
    } catch (e: any) {
      appendLog(`❌ [${e.code ?? 'unknown'}] ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ── OTP 확인 ─────────────────────────────────
  async function handleConfirm() {
    if (!confirmRef.current) return;
    if (otp.length !== 6) {
      appendLog('❌ 6자리 코드를 입력해주세요');
      return;
    }

    setLoading(true);
    const now = new Date();
    if (sendTs.current) {
      setElapsedMs(now.getTime() - sendTs.current.getTime());
    }
    appendLog(`→ confirmCode 호출: ${otp}`);

    try {
      const credential = await confirmRef.current.confirm(otp);
      const user = credential?.user;
      if (user) {
        setUid(user.uid);
        setPhoneNumber(user.phoneNumber ?? '');
        setStep('done');
        appendLog(`✅ 인증 성공 – uid: ${user.uid}`);
      }
    } catch (e: any) {
      appendLog(`❌ [${e.code ?? 'unknown'}] ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setPhone('');
    setOtp('');
    setStep('phone');
    setLog([]);
    setUid('');
    setPhoneNumber('');
    setSendTsStr('');
    setElapsedMs(null);
    sendTs.current = null;
    confirmRef.current = null;
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>전화 OTP 검증</Text>

      {/* ── 전화번호 입력 ── */}
      <View style={styles.card}>
        <Text style={styles.label}>휴대폰번호 (예: 01012345678)</Text>
        <TextInput
          style={styles.input}
          placeholder="01012345678"
          placeholderTextColor="#9ca3af"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 11))}
          keyboardType="number-pad"
          maxLength={11}
          editable={step === 'phone'}
        />

        {step === 'phone' && (
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>인증번호 받기</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* ── 발송 시각 ── */}
      {sendTsStr !== '' && (
        <View style={styles.tsBox}>
          <Text style={styles.tsText}>📤 발송 요청: {sendTsStr}</Text>
          {elapsedMs !== null && (
            <Text style={styles.tsText}>
              ⏱ 체감 대기: {(elapsedMs / 1000).toFixed(1)}초
            </Text>
          )}
        </View>
      )}

      {/* ── OTP 코드 입력 ── */}
      {(step === 'code' || step === 'done') && (
        <View style={styles.card}>
          <Text style={styles.label}>6자리 인증번호</Text>
          <TextInput
            style={[styles.input, styles.otpInput]}
            placeholder="123456"
            placeholderTextColor="#9ca3af"
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            editable={step === 'code'}
          />

          {step === 'code' && (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>확인</Text>}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── 성공 결과 ── */}
      {step === 'done' && (
        <View style={[styles.card, styles.successCard]}>
          <Text style={styles.successTitle}>✅ 인증 성공</Text>
          <Text style={styles.resultLabel}>uid</Text>
          <Text style={styles.resultValue} selectable>{uid}</Text>
          <Text style={styles.resultLabel}>phoneNumber</Text>
          <Text style={styles.resultValue} selectable>{phoneNumber}</Text>
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetText}>다시 테스트</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── 로그 ── */}
      {log.length > 0 && (
        <View style={styles.logBox}>
          <Text style={styles.logTitle}>로그</Text>
          {log.map((line, i) => (
            <Text key={i} style={styles.logLine}>{line}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  successCard: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  label: { fontSize: 13, color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  otpInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  tsBox: {
    backgroundColor: '#fefce8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  tsText: { fontSize: 13, color: '#92400e', fontFamily: 'monospace' },
  successTitle: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 8 },
  resultLabel: { fontSize: 12, color: '#6b7280', marginTop: 6 },
  resultValue: { fontSize: 13, color: '#111827', fontFamily: 'monospace' },
  resetButton: { marginTop: 12, alignItems: 'center' },
  resetText: { color: '#2563eb', fontSize: 13 },
  logBox: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 32,
  },
  logTitle: { color: '#9ca3af', fontSize: 12, marginBottom: 6 },
  logLine: { color: '#d1fae5', fontSize: 12, fontFamily: 'monospace', marginBottom: 2 },
});
