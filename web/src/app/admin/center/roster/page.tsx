"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

/** @deprecated 수강생은 「사람」 탭으로 통합 */
export default function CenterRosterRedirectPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const base = centerStaffBase(pathname, active && role === "center");

  useEffect(() => {
    router.replace(`${base}/people?tab=students`);
  }, [router, base]);

  return null;
}
