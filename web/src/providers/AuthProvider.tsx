"use client";

/**
 * 클라이언트 전용 인증 상태 — 모바일 앱의 onAuthStateChanged 패턴과 동일.
 *
 * user === undefined : 확인 중
 * user === null      : 미인증
 * user               : 인증됨
 *
 * signOut() 으로 로그아웃하면 "의도적 로그아웃" 표시가 남아서
 * /main 인증 가드가 로그인 화면 대신 온보딩 첫 화면으로 보낸다.
 * 회원 탈퇴 후에는 signOut("withdrawn") → 가드가 /goodbye 로 보낸다.
 *
 * 체험 모드(lib/demo.ts)에서는 Firebase 없이 항상 010-7656-7933 보호자(신선웅)로 로그인된 상태.
 *
 * guardianName: 보호자 이름 (계정 표시 이름 — lib/guardianName.ts). 없으면 null.
 * saveGuardianName(): 이름을 저장한다. 계정 정보가 바뀌어도 onAuthStateChanged 는 다시 오지 않아서
 *   저장한 값을 여기서 기억해 화면에 바로 반영한다.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut, updateProfile } from "firebase/auth";
import { DEMO_BLOCKED, DEMO_GUARDIAN_NAME, DEMO_MODE, DEMO_USER } from "@/lib/demo";
import { getFirebaseAuth, isFirebaseConfigured, type User } from "@/lib/firebase";
import { guardianNameError, normalizeGuardianName } from "@/lib/guardianName";

export type SignOutReason = "user" | "withdrawn";

interface AuthState {
  user: User | null | undefined;
  loading: boolean;
  /** 로그아웃 (의도적 로그아웃으로 표시). 회원 탈퇴 직후에는 "withdrawn" */
  signOut: (reason?: SignOutReason) => Promise<void>;
  /** 보호자 이름 — 없으면 null */
  guardianName: string | null;
  /** 보호자 이름 저장 (입력이 잘못되면 화면에 보여 줄 문구로 Error) — 저장한 이름을 돌려준다 */
  saveGuardianName: (raw: string) => Promise<string>;
}

let signOutReason: SignOutReason | null = null;

/** 가드에서 한 번 읽고 지운다 — null 이면 세션 만료 등 사용자가 의도하지 않은 로그아웃 */
export function consumeSignOutReason(): SignOutReason | null {
  const v = signOutReason;
  signOutReason = null;
  return v;
}

const AuthContext = createContext<AuthState>({
  user: undefined,
  loading: true,
  signOut: async () => {},
  guardianName: null,
  saveGuardianName: async (raw) => raw,
});

const DEMO_STATE: AuthState = {
  user: DEMO_USER,
  loading: false,
  signOut: async () => {},
  guardianName: DEMO_GUARDIAN_NAME,
  saveGuardianName: async () => {
    throw new Error(DEMO_BLOCKED.guardianName);
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (DEMO_MODE) return <AuthContext.Provider value={DEMO_STATE}>{children}</AuthContext.Provider>;
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}

function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [savedName, setSavedName] = useState<{ uid: string; name: string } | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      if (u) signOutReason = null;
      setUser(u);
    });
    return unsub;
  }, [configured]);

  const signOut = useCallback(async (reason: SignOutReason = "user") => {
    signOutReason = reason;
    try {
      await fbSignOut(getFirebaseAuth());
    } catch (e) {
      signOutReason = null;
      throw e;
    }
  }, []);

  const saveGuardianName = useCallback(async (raw: string) => {
    const error = guardianNameError(raw);
    if (error) throw new Error(error);
    const name = normalizeGuardianName(raw);
    const current = getFirebaseAuth().currentUser;
    if (!current) throw new Error("로그인이 필요해요. 다시 로그인해 주세요.");
    await updateProfile(current, { displayName: name });
    setSavedName({ uid: current.uid, name });
    return name;
  }, []);

  const guardianName = user
    ? savedName?.uid === user.uid
      ? savedName.name
      : user.displayName?.trim() || null
    : null;

  const value = useMemo(
    () => ({ user, loading: user === undefined, signOut, guardianName, saveGuardianName }),
    [user, signOut, guardianName, saveGuardianName],
  );

  // 배포 환경변수 누락 시 원인을 바로 알 수 있게 안내 (Firebase 초기화 에러로 앱이 죽는 것 방지)
  if (!configured) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 bg-card px-8 text-center">
        <p className="text-[40px]">⚙️</p>
        <p className="text-[18px] font-bold text-fg">서비스 설정이 완료되지 않았습니다</p>
        <p className="text-[15px] leading-[22px] text-sub">
          Firebase 환경변수(NEXT_PUBLIC_FIREBASE_API_KEY, AUTH_DOMAIN, APP_ID)가 비어 있습니다.
          <br />
          Vercel 프로젝트 설정 → Environment Variables 를 확인해주세요.
        </p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
