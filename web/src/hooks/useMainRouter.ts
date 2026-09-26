"use client";

import { useRouter } from "next/navigation";
import { useMapMainPath } from "@/hooks/useMainBase";

/** /main 경로 이동 — /demo/guardian 체험 시 URL prefix 자동 반영 */
export function useMainRouter() {
  const router = useRouter();
  const mapMain = useMapMainPath();
  return {
    pushMain: (mainPath: string) => router.push(mapMain(mainPath)),
    replaceMain: (mainPath: string) => router.replace(mapMain(mainPath)),
  };
}
