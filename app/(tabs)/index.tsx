/**
 * Tab A: 등록코드 검증
 *
 * 플로우:
 *   1단계 - 코드 입력 → previewCode 호출 → 캠퍼스명 + 마스킹 학생명 표시
 *   2단계 - 생년월일 8자리 + 휴대폰번호 입력 → redeemCode 호출
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { functions } from '../../firebase';

// ────────────────────────────────────────────
// 코드 포맷 헬퍼 (DS26-A3F7K)
// ────────────────────────────────────────────
function formatCode(raw: string): string {
  // 영숫자만 남기고 대문자로, 4자리마다 하이픈
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 9);
  if (clean.length <= 4) return clean;
  return clean.slice(0, 4) + '-' + clean.slice(4);
}

// ────────────────────────────────────────────
// 컴포넌트
// ────────────────────────────────────────────
export default function EnrollmentScreen() {
  // 1단계 상태
  const [rawCode, setRawCode] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [previewResult, setPreviewResult] = useState<{
    campusName: string;
    maskedStudentName: string;
  } | null>(null);

  // 2단계 상태
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');

  // 공통 상태
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function appendLog(msg: string) {
    const ts = new Date().toLocaleTimeString('ko-KR');
    setLog((prev) => [`[${ts}] ${msg}`, ...prev]);
  }

  // ── 1단계: previewCode ──────────────────────
  async function handlePreview() {
    const code = rawCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (code.length !== 9) {
      appendLog('❌ 코드는 9자리여야 합니다 (예: DS26A3F7K)');
      return;
    }

    setLoading(true);
    appendLog(`→ previewCode 호출: ${formatCode(code)}`);
    try {
      const previewCode = functions.httpsCallable('previewCode');
      const result = await previewCode({ code: formatCode(code) });
      const data = result.data as { campusName: string; maskedStudentName: string };
      setPreviewResult(data);
      setStep(2);
      appendLog(`✅ 캠퍼스: ${data.campusName}, 학생: ${data.maskedStudentName}`);
    } catch (e: any) {
      appendLog(`❌ [${e.code ?? 'unknown'}] ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ── 2단계: redeemCode ───────────────────────
  async function handleRedeem() {
    if (birthDate.length !== 8) {
      appendLog('❌ 생년월일은 8자리 숫자여야 합니다 (예: 20100315)');
      return;
    }
    if (phone.length < 10) {
      appendLog('❌ 유효한 휴대폰번호를 입력해주세요');
      return;
    }

    const code = rawCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    setLoading(true);
    appendLog(`→ redeemCode 호출: code=${formatCode(code)}, birth=${birthDate}, phone=${phone}`);
    try {
      const redeemCode = functions.httpsCallable('redeemCode');
      const result = await redeemCode({
        code: formatCode(code),
        birthDate,
        phone,
      });
      const data = result.data as { customToken?: string; existingUser?: boolean };

      if (data.existingUser) {
        appendLog('✅ 기존 계정에 학생 연결 완료 (existingUser: true)');
        Alert.alert('성공', '기존 계정에 학생이 연결되었습니다.');
      } else if (data.customToken) {
        appendLog('✅ 신규 계정 생성 완료 – customToken 수신');
        // 실제 앱에서는 signInWithCustomToken(customToken) 후 세션 저장
        Alert.alert('성공', `신규 customToken 수신\n(토큰 앞 20자: ${data.customToken.slice(0, 20)}…)`);
      }
    } catch (e: any) {
      appendLog(`❌ [${e.code ?? 'unknown'}] ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRawCode('');
    setStep(1);
    setPreviewResult(null);
    setBirthDate('');
    setPhone('');
    setLog([]);
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>등록코드 검증</Text>

      {/* ── 1단계 ── */}
      <View style={styles.card}>
        <Text style={styles.label}>등록코드</Text>
        <TextInput
          style={styles.input}
          placeholder="DS26-A3F7K"
          placeholderTextColor="#9ca3af"
          value={formatCode(rawCode)}
          onChangeText={(t) => {
            // 하이픈 제거 후 raw 저장, 표시는 formatCode로
            setRawCode(t.replace(/[^A-Z0-9]/gi, '').toUpperCase());
          }}
          autoCapitalize="characters"
          maxLength={10}
          editable={step === 1}
        />
        {step === 1 && (
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handlePreview}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>확인</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* ── 2단계 (previewResult 있을 때) ── */}
      {previewResult && (
        <View style={styles.card}>
          <Text style={styles.previewText}>
            🏫 {previewResult.campusName} · 학생: {previewResult.maskedStudentName}
          </Text>

          <Text style={styles.label}>생년월일 (8자리, 예: 20100315)</Text>
          <TextInput
            style={styles.input}
            placeholder="20100315"
            placeholderTextColor="#9ca3af"
            value={birthDate}
            onChangeText={(t) => setBirthDate(t.replace(/\D/g, '').slice(0, 8))}
            keyboardType="number-pad"
            maxLength={8}
          />

          <Text style={styles.label}>보호자 휴대폰번호 (예: 01012345678)</Text>
          <TextInput
            style={styles.input}
            placeholder="01012345678"
            placeholderTextColor="#9ca3af"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 11))}
            keyboardType="number-pad"
            maxLength={11}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRedeem}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>등록</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Text style={styles.resetText}>처음부터</Text>
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
  label: { fontSize: 13, color: '#374151', marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  resetButton: { marginTop: 8, alignItems: 'center' },
  resetText: { color: '#6b7280', fontSize: 13 },
  previewText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logBox: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 32,
  },
  logTitle: { color: '#9ca3af', fontSize: 12, marginBottom: 6 },
  logLine: { color: '#d1fae5', fontSize: 12, fontFamily: 'monospace', marginBottom: 2 },
});
