/**
 * 온보딩 Step 1 — 환영 화면 + 등록코드 입력
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
import { router } from 'expo-router';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '../../firebase';
import { errCode, errMessage } from '../../lib/errors';

function formatCode(raw: string): string {
  const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 9);
  if (clean.length <= 4) return clean;
  return clean.slice(0, 4) + '-' + clean.slice(4);
}

export default function OnboardingStep1() {
  const [rawCode, setRawCode] = useState('');
  const [loading, setLoading] = useState(false);

  const code = rawCode.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const isReady = code.length === 9;

  async function handleNext() {
    if (!isReady) {
      Alert.alert('코드 확인', '9자리 등록코드를 입력해주세요.\n예) DS26-A3F7K');
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable(functions, 'previewCode');
      const result = await fn({ code: formatCode(code) });
      const data = result.data as { campusName: string; maskedStudentName: string };
      // 다음 단계로 코드 + 미리보기 데이터 전달
      router.push({
        pathname: '/onboarding/verify',
        params: {
          code: formatCode(code),
          campusName: data.campusName,
          maskedStudentName: data.maskedStudentName,
        },
      });
    } catch (e) {
      const c = errCode(e);
      const msg =
        c === 'functions/not-found'
          ? '존재하지 않는 등록코드입니다.'
          : c === 'functions/already-exists'
          ? '이미 사용된 등록코드입니다.'
          : c === 'functions/deadline-exceeded'
          ? '만료된 등록코드입니다.'
          : errMessage(e);
      Alert.alert('오류', msg);
    } finally {
      setLoading(false);
    }
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
        {/* 상단 헤더 */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>TC</Text>
          </View>
          <Text style={styles.title}>ThinkCampus</Text>
          <Text style={styles.subtitle}>학부모 전용 서비스</Text>
        </View>

        {/* 안내 문구 */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📌 등록코드 안내</Text>
          <Text style={styles.infoDesc}>
            캠퍼스 담당자에게 받은 등록코드를 입력해주세요.{'\n'}
            자녀의 교육 일정과 피드백을 확인할 수 있습니다.
          </Text>
        </View>

        {/* 코드 입력 */}
        <View style={styles.inputSection}>
          <Text style={styles.label}>등록코드</Text>
          <TextInput
            style={[styles.codeInput, isReady && styles.codeInputReady]}
            placeholder="DS26-A3F7K"
            placeholderTextColor="#9ca3af"
            value={formatCode(rawCode)}
            onChangeText={(t) =>
              setRawCode(t.replace(/[^A-Z0-9]/gi, '').toUpperCase())
            }
            autoCapitalize="characters"
            maxLength={10}
            autoCorrect={false}
          />
          {isReady && (
            <Text style={styles.readyHint}>✓ 코드 확인 완료</Text>
          )}
        </View>

        {/* 다음 버튼 */}
        <TouchableOpacity
          style={[styles.button, (!isReady || loading) && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!isReady || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>다음</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helpText}>
          등록코드가 없으신가요?{'\n'}자녀가 등록된 캠퍼스에 문의해주세요.
        </Text>

        {/* 기존 학부모 로그인 */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/onboarding/login')}
        >
          <Text style={styles.loginLinkText}>
            이미 등록하셨나요?{' '}
            <Text style={styles.loginLinkBold}>전화번호로 로그인</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d4ed8',
    marginBottom: 6,
  },
  infoDesc: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 23,
  },
  inputSection: { marginBottom: 24 },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 14,
    fontSize: 24,
    color: '#111827',
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: '600',
    backgroundColor: '#f9fafb',
  },
  codeInputReady: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
  },
  readyHint: {
    fontSize: 14,
    color: '#1d4ed8',
    marginTop: 6,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: { backgroundColor: '#bfdbfe' },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 23,
  },
  loginLink: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 16,
    color: '#6b7280',
  },
  loginLinkBold: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
