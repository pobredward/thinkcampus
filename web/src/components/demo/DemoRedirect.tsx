"use client";

/**
 * 체험 중에 등록코드·로그인 화면으로 오면 체험 역할의 홈으로 보낸다 (이미 로그인된 것과 같으므로)
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { DEMO_ROLE_HOME } from "@/lib/demoMode";
import { useDemo } from "@/providers/DemoProvider";

export function DemoRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { role } = useDemo();
  useEffect(() => {
    if (role) router.replace(DEMO_ROLE_HOME[role]);
  }, [role, router]);
  return role ? <LoadingScreen /> : <>{children}</>;
}
