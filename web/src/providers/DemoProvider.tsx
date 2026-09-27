"use client";

/**
 * 체험판 상태 — 루트 layout(서버)이 쿠키에서 읽은 역할을 그대로 넘긴다.
 * 서버·클라이언트가 같은 값으로 첫 렌더를 하므로 하이드레이션 오류가 없다.
 *
 *   role   : 체험 중인 역할 (아니면 null)
 *   active : 체험 중인지
 *   reset  : 체험 데이터를 처음 상태로 (services/demo 의 세계를 지우고 새로고침)
 */

import { createContext, useContext, useMemo } from "react";
import type { DemoRole } from "@/lib/demoMode";
import { resetDemoWorld } from "@/services/demo/world";

interface DemoState {
  role: DemoRole | null;
  active: boolean;
  reset: () => void;
}

const DemoContext = createContext<DemoState>({ role: null, active: false, reset: () => {} });

export function DemoProvider({ role, children }: { role: DemoRole | null; children: React.ReactNode }) {
  const value = useMemo<DemoState>(
    () => ({
      role,
      active: role !== null,
      reset: () => {
        resetDemoWorld();
        if (typeof window !== "undefined") window.location.reload();
      },
    }),
    [role],
  );
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoState {
  return useContext(DemoContext);
}
