"use client";

/**
 * 자녀가 2명 이상인 보호자의 "현재 보고 있는 자녀" 선택 상태.
 * - 선택값은 이 기기에만 저장 (localStorage, 로그인 계정별 키)
 * - 저장된 자녀가 목록에 없으면(연결 해제 등) 첫 번째 자녀로
 */

import { useCallback, useMemo, useState } from "react";
import type { Child } from "@/hooks/useChildren";

const keyFor = (uid: string) => `tc.selectedStudent.${uid}`;

function readStored(uid: string | undefined): string | null {
  if (!uid || typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(keyFor(uid));
  } catch {
    return null;
  }
}

export function useSelectedChild(children: Child[], uid: string | undefined) {
  const [stored, setStored] = useState<{ uid: string | undefined; id: string | null }>(() => ({
    uid,
    id: readStored(uid),
  }));

  // 계정이 바뀌면 그 계정의 저장값을 쓴다
  const storedId = stored.uid === uid ? stored.id : readStored(uid);

  const selectedIndex = useMemo(() => {
    const i = children.findIndex((c) => c.studentId === storedId);
    return i >= 0 ? i : 0;
  }, [children, storedId]);

  const selected: Child | null = children[selectedIndex] ?? null;

  const select = useCallback(
    (studentId: string) => {
      setStored({ uid, id: studentId });
      if (!uid) return;
      try {
        window.localStorage.setItem(keyFor(uid), studentId);
      } catch {
        /* private mode 등 — 이번 방문 동안만 유지 */
      }
    },
    [uid],
  );

  return { selected, selectedIndex, select };
}

/** 회원 탈퇴 시 이 기기에 남은 선택값 삭제 */
export function clearSelectedChild(uid: string): void {
  try {
    window.localStorage.removeItem(keyFor(uid));
  } catch {
    /* 무시 */
  }
}
