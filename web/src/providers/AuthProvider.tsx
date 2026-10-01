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
 * 체험(DemoProvider 의 role)에서는 Firebase 없이 역할별 체험 계정으로 로그인된 상태 (학부모는 010-7656-7933 보호자 손영란).
 *
 * guardianName: 보호자 이름 (계정 표시 이름 — lib/guardianName.ts). 없으면 null.
 * saveGuardianName(): 이름을 저장한다. 계정 정보가 바뀌어도 onAuthStateChanged 는 다시 오지 않아서
 *   저장한 값을 여기서 기억해 화면에 바로 반영한다.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, signOut as fbSignOut, updateProfile } from "firebase/auth";
import { isFirebaseOptionalPath } from "@/lib/demoMode";
import type { DemoRole } from "@/lib/demoMode";
import { getFirebaseAuth, isFirebaseConfigured, type User } from "@/lib/firebase";
import { guardianNameError, normalizeGuardianName } from "@/lib/guardianName";
import { useDemo } from "@/providers/DemoProvider";
import { demoGuardianName, setDemoGuardianName } from "@/services/demo/guardianApi";
import { DEMO_GUARDIAN_PHONE_E164, DEMO_GUARDIAN_UID, DEMO_OFFICER, DEMO_STAFF } from "@/services/demo/world";

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

// ── 체험 계정 ─────────────────────────────────────────────

function demoUser(role: DemoRole): User {
  const base = { isAnonymous: false, providerData: [] };
  switch (role) {
    case "guardian":
      return { ...base, uid: DEMO_GUARDIAN_UID, phoneNumber: DEMO_GUARDIAN_PHONE_E164, displayName: demoGuardianName() } as unknown as User;
    case "company":
      return { ...base, uid: DEMO_STAFF.company.uid, email: DEMO_STAFF.company.email, displayName: DEMO_STAFF.company.displayName } as unknown as User;
    case "center":
      return { ...base, uid: DEMO_STAFF.center.uid, email: DEMO_STAFF.center.email, displayName: DEMO_STAFF.center.displayName } as unknown as User;
    case "instructor":
      return { ...base, uid: DEMO_STAFF.instructor.uid, email: DEMO_STAFF.instructor.email, displayName: DEMO_STAFF.instructor.displayName } as unknown as User;
    case "officer":
      return { ...base, uid: DEMO_OFFICER.uid, email: DEMO_OFFICER.email, displayName: DEMO_OFFICER.displayName } as unknown as User;
  }
}

/** 체험: Firebase 없이 역할별 계정으로 로그인된 상태. 이름 저장은 체험 세계에, 로그아웃은 체험 종료. */
function DemoAuthProvider({ role, children }: { role: DemoRole; children: React.ReactNode }) {
  const [name, setName] = useState<string | null>(() => (role === "guardian" ? demoGuardianName() : null));
  const value = useMemo<AuthState>(
    () => ({
      user: demoUser(role),
      loading: false,
      signOut: async () => {
        // /demo/exit 가 쿠키를 지우고 허브로 보낸다 (서버 응답이라 전체 이동)
        window.location.replace("/demo/exit");
      },
      guardianName: name,
      saveGuardianName: async (raw) => {
        const error = guardianNameError(raw);
        if (error) throw new Error(error);
        const normalized = normalizeGuardianName(raw);
        setDemoGuardianName(normalized);
        setName(normalized);
        return normalized;
      },
    }),
    [role, name],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { role } = useDemo();
  if (role) return <DemoAuthProvider role={role}>{children}</DemoAuthProvider>;
  return <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}

function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [savedName, setSavedName] = useState<{ uid: string; name: string } | null>(null);
  const configured = isFirebaseConfigured();
  const pathname = usePathname();
  // 체험판 허브(/demo)·공유 리포트(/r)는 Firebase 없이도 떠야 한다
  const firebaseOptional = isFirebaseOptionalPath(pathname);

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
  if (!configured && !firebaseOptional) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-3 bg-card px-8 text-center">
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
