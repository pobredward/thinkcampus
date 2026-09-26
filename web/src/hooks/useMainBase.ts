"use client";

import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { mapMainPath } from "@/lib/demoPortal";

export function useMainBase(): string {
  return useDemoPortal().mainBase;
}

/** /main/... 경로를 현재 체험판(학부모) base 에 맞게 변환 */
export function useMapMainPath(): (mainPath: string) => string {
  const base = useMainBase();
  return (mainPath: string) => mapMainPath(mainPath, base);
}
