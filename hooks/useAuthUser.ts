/**
 * 현재 로그인 사용자 (undefined: 확인 중, null: 미인증)
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { auth } from '../firebase';

export function useAuthUser(): FirebaseAuthTypes.User | null | undefined {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null | undefined>(
    () => auth.currentUser ?? undefined,
  );
  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);
  return user;
}
