"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { installHistoryWatch, recordNavigation } from "@/lib/navHistory";

// 첫 렌더 전에 history API 를 감싸 둔다 (브라우저에서만)
if (typeof window !== "undefined") installHistoryWatch();

/** 경로 변경을 기록 (렌더 결과 없음) */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    recordNavigation(pathname);
  }, [pathname]);
  return null;
}
