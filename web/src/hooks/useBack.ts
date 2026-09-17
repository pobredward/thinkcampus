"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { hasInAppHistory, previousPath } from "@/lib/navHistory";

/**
 * RN router.back() 대체.
 * 앱 안에서 이동해 온 경우 → 브라우저 뒤로가기
 * 링크로 바로 들어온 경우 → fallback 경로로 이동
 */
export function useBack(fallback: string) {
  const router = useRouter();
  return useCallback(() => {
    if (hasInAppHistory()) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}

/**
 * "상위 화면으로" 이동 (예: 프로그램 상세의 "← 홈").
 * 바로 전 화면이 그 상위 화면이면 뒤로가기, 아니면(회차 상세를 거쳐 온 경우 등) 그 화면으로 이동.
 * → 뒤로가기가 엉뚱한 하위 화면으로 가는 일을 막는다.
 */
export function useUpTo(target: string, opts?: { skip?: RegExp }) {
  const router = useRouter();
  const skip = opts?.skip;
  return useCallback(() => {
    const targetPath = target.split("?")[0];
    if (previousPath(skip) === targetPath) router.back();
    else router.push(target);
  }, [router, target, skip]);
}
