/**
 * 자녀가 2명 이상인 보호자의 "현재 보고 있는 자녀" 선택 상태.
 * - 선택값은 앱이 켜져 있는 동안 계정별로 기억한다 (메모리).
 *   앱을 껐다 켜도 유지하려면 @react-native-async-storage/async-storage 추가 후
 *   아래 store 를 AsyncStorage 로 바꾸면 된다 (네이티브 모듈이라 dev client 재빌드 필요).
 * - 저장된 자녀가 목록에 없으면(연결 해제 등) 첫 번째 자녀로
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Child } from './useChildren';

const store = new Map<string, string>();
const listeners = new Set<() => void>();
let version = 0;

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
const getVersion = () => version;

function setStored(uid: string, studentId: string) {
  store.set(uid, studentId);
  version++;
  listeners.forEach((l) => l());
}

/** 회원 탈퇴·로그아웃 시 선택값 삭제 */
export function clearSelectedChild(uid: string): void {
  if (store.delete(uid)) {
    version++;
    listeners.forEach((l) => l());
  }
}

export function useSelectedChild(children: Child[], uid: string | undefined) {
  const v = useSyncExternalStore(subscribe, getVersion, getVersion);
  const storedId = useMemo(() => (uid ? (store.get(uid) ?? null) : null), [uid, v]);

  const selectedIndex = useMemo(() => {
    const i = children.findIndex((c) => c.studentId === storedId);
    return i >= 0 ? i : 0;
  }, [children, storedId]);

  const selected: Child | null = children[selectedIndex] ?? null;

  const select = useCallback(
    (studentId: string) => {
      if (uid) setStored(uid, studentId);
    },
    [uid],
  );

  return { selected, selectedIndex, select };
}
