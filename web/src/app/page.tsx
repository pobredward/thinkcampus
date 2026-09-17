"use client";

/**
 * 앱 진입점 — Auth 상태 확인 후 리디렉션 (모바일 app/index.tsx 와 동일)
 *   확인 중  → 로딩 화면
 *   미인증   → /onboarding
 *   인증됨   → /main
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useAuth } from "@/providers/AuthProvider";

export default function IndexPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === undefined) return;
    router.replace(user ? "/main" : "/onboarding");
  }, [user, router]);

  return <LoadingScreen />;
}
