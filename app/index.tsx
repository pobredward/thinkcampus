/**
 * 앱 진입점 — Auth 상태 확인 후 리디렉션
 *
 * thinkcampus:/// 로 열리면 이 파일이 먼저 렌더됨.
 * Firebase Auth 상태에 따라:
 *   - 확인 중  → 로딩 화면
 *   - 미인증   → /onboarding
 *   - 인증됨   → /main
 */

import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { auth } from '../firebase';
import LoadingScreen from '../components/LoadingScreen';

export default function Index() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  // Auth 확인 중
  if (user === undefined) {
    return <LoadingScreen />;
  }

  // 미인증 → 온보딩
  if (user === null) {
    return <Redirect href="/onboarding" />;
  }

  // 인증됨 → 메인
  return <Redirect href="/main" />;
}
