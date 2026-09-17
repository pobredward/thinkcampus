/**
 * 회원 탈퇴 완료 안내 (회원 탈퇴 화면이 로그아웃 후 이리로 보낸다)
 * 로그인한 채로 열리면 홈으로 돌려보낸다.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import LoadingScreen from '../components/LoadingScreen';
import { useAuthUser } from '../hooks/useAuthUser';

export default function GoodbyeScreen() {
  const user = useAuthUser();

  if (user === undefined) return <LoadingScreen />;
  if (user) return <Redirect href="/main" />;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>👋</Text>
      <Text style={styles.title} accessibilityRole="header">
        탈퇴가 완료되었어요
      </Text>
      <Text style={styles.desc} lineBreakStrategyIOS="hangul-word">
        그동안 씽크캠퍼스를 이용해 주셔서 감사합니다.{'\n'}다시 이용하시려면 캠퍼스에서 등록코드를 받아 주세요.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.replace('/onboarding')} activeOpacity={0.85}>
        <Text style={styles.btnText}>처음 화면으로</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
  },
  emoji: { fontSize: 56 },
  title: { marginTop: 16, fontSize: 24, fontWeight: '800', color: '#111827' },
  desc: { marginTop: 12, fontSize: 17, lineHeight: 27, color: '#374151', textAlign: 'center' },
  btn: {
    marginTop: 40,
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
});
