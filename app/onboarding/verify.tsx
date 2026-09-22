/**
 * 온보딩 Step 2 — 생년월일 / 관계 / 보호자 이름 / 전화번호 입력 → redeemCode (웹 app/onboarding/verify/page.tsx)
 * redeemCode 성공 시 Step 3 (OTP) 또는 기존계정 완료로 이동
 * 보호자 이름은 서버로 보내지 않고, OTP 로그인 직후 계정 표시 이름으로 저장한다 (lib/guardianName.ts)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from '@react-native-firebase/functions';
import { signInWithCustomToken } from '@react-native-firebase/auth';
import { auth, functions } from '../../firebase';
import { saveGuardianName } from '../../hooks/useGuardianName';
import { errMessage } from '../../lib/errors';
import { GUARDIAN_NAME_MAX, guardianNameError, normalizeGuardianName } from '../../lib/guardianName';

const RELATION_PRESETS = ['모(엄마)', '부(아빠)', '조모(할머니)', '조부(할아버지)', '기타'];

export default function OnboardingVerify() {
  const { code, campusName, maskedStudentName } = useLocalSearchParams<{
    code: string;
    campusName: string;
    maskedStudentName: string;
  }>();

  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  const nameError = guardianNameError(guardianName);
  const isReady =
    birthDate.length === 8 && phone.length >= 10 && relation.trim().length > 0 && nameError === null;

  async function handleSubmit() {
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'redeemCode');
      const result = await fn({ code, birthDate, phone, relation: relation.trim() });
      const data = result.data as { customToken?: string; existingUser?: boolean };

      if (data.existingUser) {
        // 기존 계정 → 이 기기에서 로그인돼 있으면 메인, 아니면 전화번호 로그인으로
        // 지금 그 계정으로 로그인해 있고 이름이 없으면 입력한 이름을 넣어 둔다
        const current = auth.currentUser;
        if (current && !current.displayName && current.phoneNumber === `+82${phone.replace(/^0/, '')}`) {
          await saveGuardianName(guardianName).catch(() => undefined);
        }
        Alert.alert('등록 완료', '기존 계정에 자녀가 연결되었습니다.', [
          {
            text: '확인',
            onPress: () => router.replace(auth.currentUser ? '/main' : '/onboarding/login'),
          },
        ]);
      } else if (data.customToken) {
        // 신규 계정 → OTP 인증 화면으로
        router.push({
          pathname: '/onboarding/otp',
          params: { phone, customToken: data.customToken, guardianName: normalizeGuardianName(guardianName) },
        });
      }
    } catch (e) {
      // "생년월일이 일치하지 않습니다 (시도 N/5)", "시도 횟수 초과…" 등 서버 메시지 그대로 (앞의 [코드] 는 제거)
      Alert.alert('오류', errMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function formatBirth(raw: string) {
    const d = raw.slice(0, 8);
    if (d.length <= 4) return d;
    if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
    return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* 뒤로가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← 이전</Text>
        </TouchableOpacity>

        {/* 진행 단계 */}
        <View style={styles.stepRow}>
          <View style={styles.stepDot} />
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepDot} />
        </View>

        <Text style={styles.title}>자녀 정보 확인</Text>

        {/* 캠퍼스 미리보기 */}
        <View style={styles.previewBox}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>캠퍼스</Text>
            <Text style={styles.previewValue}>{campusName}</Text>
          </View>
          <View style={[styles.previewRow, { borderTopWidth: 1, borderTopColor: '#262b36' }]}>
            <Text style={styles.previewLabel}>학생</Text>
            <Text style={styles.previewValue}>{maskedStudentName}</Text>
          </View>
        </View>

        {/* 자녀 생년월일 */}
        <View style={styles.field}>
          <Text style={styles.label}>자녀 생년월일</Text>
          <TextInput
            style={styles.input}
            placeholder="2010.03.15"
            placeholderTextColor="#9ca3af"
            value={formatBirth(birthDate)}
            onChangeText={(t) => setBirthDate(t.replace(/\D/g, '').slice(0, 8))}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>

        {/* 나와의 관계 */}
        <View style={styles.field}>
          <Text style={styles.label}>나와 자녀의 관계</Text>
          <View style={styles.chips}>
            {RELATION_PRESETS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, relation === r && styles.chipActive]}
                onPress={() => setRelation(r)}
              >
                <Text style={[styles.chipText, relation === r && styles.chipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="직접 입력 (예: 외조모, 고모)"
            placeholderTextColor="#9ca3af"
            value={relation}
            onChangeText={setRelation}
          />
        </View>

        {/* 보호자 이름 — OTP 로그인 직후 계정 표시 이름으로 저장 (홈 인사말) */}
        <View style={styles.field}>
          <Text style={styles.label} nativeID="guardianNameLabel">
            보호자 이름
          </Text>
          <TextInput
            style={[styles.input, nameTouched && !!nameError && styles.inputError]}
            placeholder="예: 홍길동"
            placeholderTextColor="#9ca3af"
            value={guardianName}
            onChangeText={setGuardianName}
            onBlur={() => setNameTouched(true)}
            maxLength={GUARDIAN_NAME_MAX}
            autoComplete="name"
            textContentType="name"
            accessibilityLabel="보호자 이름"
            aria-labelledby="guardianNameLabel"
          />
          {nameTouched && nameError ? (
            <Text style={styles.errorHint} accessibilityRole="alert">
              {nameError}
            </Text>
          ) : (
            <Text style={styles.hint}>홈에서 &quot;OOO 학부모님&quot;으로 인사드려요.</Text>
          )}
        </View>

        {/* 보호자 전화번호 */}
        <View style={styles.field}>
          <Text style={styles.label}>보호자 전화번호</Text>
          <TextInput
            style={styles.input}
            placeholder="01012345678"
            placeholderTextColor="#9ca3af"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 11))}
            keyboardType="number-pad"
            maxLength={11}
          />
          <Text style={styles.hint}>
            입력한 번호로 인증 문자가 발송됩니다.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (!isReady || loading) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={!isReady || loading}
        >
          {loading ? (
            <ActivityIndicator color="#0c0e13" />
          ) : (
            <Text style={styles.buttonText}>인증번호 받기</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#161a22' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#d4b06a', fontWeight: '500' },
  stepRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#343a47',
  },
  stepDotActive: { backgroundColor: '#d4b06a', width: 24 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f2f2f0',
    marginBottom: 20,
  },
  previewBox: {
    backgroundColor: '#1e232d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#343a47',
    marginBottom: 24,
    overflow: 'hidden',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewLabel: { fontSize: 15, color: '#9aa0ab' },
  previewValue: { fontSize: 15, fontWeight: '600', color: '#f2f2f0' },
  field: { marginBottom: 20 },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d4d7dd',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#262b36',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 17,
    color: '#f2f2f0',
    backgroundColor: '#1e232d',
  },
  hint: { fontSize: 14, color: '#9aa0ab', marginTop: 6 },
  errorHint: { fontSize: 14, color: '#f27d78', marginTop: 6 },
  inputError: { borderColor: '#f27d78' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#262b36',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#1e232d',
  },
  chipActive: { borderColor: '#d4b06a', backgroundColor: '#1e232d' },
  chipText: { fontSize: 15, color: '#d4d7dd' },
  chipTextActive: { color: '#d4b06a', fontWeight: '600' },
  button: {
    backgroundColor: '#d4b06a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#343a47' },
  buttonText: { color: '#0c0e13', fontSize: 17, fontWeight: '700' },
});
