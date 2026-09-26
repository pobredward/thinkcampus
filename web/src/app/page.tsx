"use client";

/**
 * 웹 루트 — 역할별 체험판 허브로 보낸다.
 * 실서비스(등록코드·로그인)는 /demo 에서 링크 또는 /onboarding 직접 진입.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DEMO_HUB_PATH } from "@/lib/demoPortal";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(DEMO_HUB_PATH);
  }, [router]);

  return <LoadingScreen />;
}
