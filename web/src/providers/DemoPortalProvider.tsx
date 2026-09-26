"use client";

import { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import {
  demoRoleFromPath,
  isDemoPortalPath,
  mainBaseFromPath,
  type DemoRole,
} from "@/lib/demoPortal";

interface DemoPortalState {
  role: DemoRole | null;
  active: boolean;
  mainBase: string;
}

const DemoPortalContext = createContext<DemoPortalState>({
  role: null,
  active: false,
  mainBase: "/main",
});

export function DemoPortalProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const value = useMemo(
    () => ({
      role: demoRoleFromPath(pathname),
      active: isDemoPortalPath(pathname),
      mainBase: mainBaseFromPath(pathname),
    }),
    [pathname],
  );
  return <DemoPortalContext.Provider value={value}>{children}</DemoPortalContext.Provider>;
}

export function useDemoPortal(): DemoPortalState {
  return useContext(DemoPortalContext);
}
