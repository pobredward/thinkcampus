"use client";

/**
 * 체험 모드에서 등록코드·로그인 화면으로 들어오면 바로 메인으로 보낸다 (lib/demo.ts)
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DEMO_MODE } from "@/lib/demo";

export function DemoRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (DEMO_MODE) router.replace("/main");
  }, [router]);
  return DEMO_MODE ? <LoadingScreen /> : <>{children}</>;
}
