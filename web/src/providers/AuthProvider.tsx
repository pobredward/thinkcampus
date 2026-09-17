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
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured, type User } from "@/lib/firebase";

export type SignOutReason = "user" | "withdrawn";

interface AuthState {
  user: User | null | undefined;
  loading: boolean;
  /** 로그아웃 (의도적 로그아웃으로 표시). 회원 탈퇴 직후에는 "withdrawn" */
  signOut: (reason?: SignOutReason) => Promise<void>;
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
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
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

  const value = useMemo(
    () => ({ user, loading: user === undefined, signOut }),
    [user, signOut],
  );

  // 배포 환경변수 누락 시 원인을 바로 알 수 있게 안내 (Firebase 초기화 에러로 앱이 죽는 것 방지)
  if (!configured) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 bg-white px-8 text-center">
        <p className="text-[40px]">⚙️</p>
        <p className="text-[18px] font-bold text-gray-900">서비스 설정이 완료되지 않았습니다</p>
        <p className="text-[15px] leading-[22px] text-gray-500">
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
