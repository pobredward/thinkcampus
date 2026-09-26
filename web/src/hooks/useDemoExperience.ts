"use client";

import { DEMO_MODE } from "@/lib/demo";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

/** 전역 체험 모드 또는 /demo/* 체험판 */
export function useDemoExperience(): boolean {
  const { active } = useDemoPortal();
  return DEMO_MODE || active;
}

/** 학부모 앱 더미 데이터·Firebase 스킵 */
export function useGuardianDemoData(): boolean {
  const { active, role } = useDemoPortal();
  return DEMO_MODE || (active && role === "guardian");
}
