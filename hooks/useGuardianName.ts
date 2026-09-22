/**
 * 보호자(학부모) 이름 — 계정 표시 이름(displayName). 규칙·문구는 lib/guardianName.ts
 * (웹은 providers/AuthProvider 의 guardianName · saveGuardianName)
 *
 * 계정 정보를 바꿔도 onAuthStateChanged 는 다시 오지 않아서, 저장한 값을 여기서 기억해 화면에 바로 반영한다.
 * 홈의 "성함을 알려 주세요" 카드를 [나중에]로 닫은 것은 앱이 켜져 있는 동안만 기억한다.
 */

import { useEffect, useState } from 'react';
import { updateProfile } from '@react-native-firebase/auth';
import { auth } from '../firebase';
import { errMessage } from '../lib/errors';
import { guardianNameError, normalizeGuardianName } from '../lib/guardianName';
import { useAuthUser } from './useAuthUser';

let saved: { uid: string; name: string } | null = null;
const laterUids = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function useStoreVersion() {
  const [, bump] = useState(0);
  useEffect(() => {
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}

/** 지금 로그인한 보호자의 이름 — 없으면 null */
export function useGuardianName(): string | null {
  const user = useAuthUser();
  useStoreVersion();
  if (!user) return null;
  if (saved?.uid === user.uid) return saved.name;
  return user.displayName?.trim() || null;
}

/** 이름 저장 — 입력이 잘못되면 화면에 보여 줄 문구로 Error. 저장한 이름을 돌려준다 */
export async function saveGuardianName(raw: string): Promise<string> {
  const error = guardianNameError(raw);
  if (error) throw new Error(error);
  const name = normalizeGuardianName(raw);
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요해요. 다시 로그인해 주세요.');
  await updateProfile(user, { displayName: name });
  saved = { uid: user.uid, name };
  notify();
  return name;
}

/** 홈 이름 카드를 [나중에]로 닫았는지 */
export function useNamePromptLater(uid: string | undefined): [boolean, () => void] {
  useStoreVersion();
  const later = !!uid && laterUids.has(uid);
  const dismiss = () => {
    if (!uid) return;
    laterUids.add(uid);
    notify();
  };
  return [later, dismiss];
}

/** 저장 실패 문구 — 입력 확인 문구는 그대로, Firebase 오류는 알기 쉬운 말로 */
export function guardianNameSaveError(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  if (e instanceof Error && !code) return e.message;
  return errMessage(e, '이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
}
