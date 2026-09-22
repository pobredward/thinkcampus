"use client";

/**
 * 메인 레이아웃 — 인증 가드 + 하단 탭바 (홈 / 알림 / 내 정보)
 *
 * 웹은 URL 로 직접 진입할 수 있으므로 여기서 로그인 여부를 확인한다.
 *   확인 중        → 로딩 화면
 *   직접 로그아웃   → /onboarding (등록코드 첫 화면, 모바일과 동일)
 *   회원 탈퇴      → /goodbye (탈퇴 완료 안내)
 *   세션 없음/만료  → /onboarding/login (로그인 후 원래 경로로 돌아오도록 next 전달)
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { TabBar } from "@/components/ui/TabBar";
import { consumeSignOutReason, useAuth } from "@/providers/AuthProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user !== null) return;
    const reason = consumeSignOutReason();
    if (reason) {
      router.replace(reason === "withdrawn" ? "/goodbye" : "/onboarding");
      return;
    }
    const next = pathname && pathname !== "/main" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/onboarding/login${next}`);
    // pathname 변화에는 반응하지 않는다 (로그아웃 순간의 경로만 사용)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  if (!user) return <LoadingScreen />;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper">
      <div className="flex flex-1 flex-col">{children}</div>
      <TabBar />
    </div>
  );
}
