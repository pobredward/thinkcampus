"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RosterGuardianFilter } from "@/lib/centerRoster";

interface CenterScopeState {
  sectionId: string;
  setSectionId: (id: string) => void;
  rosterQ: string;
  setRosterQ: (q: string) => void;
  guardianFilter: RosterGuardianFilter;
  setGuardianFilter: (f: RosterGuardianFilter) => void;
  scheduleDate: string;
  setScheduleDate: (d: string) => void;
}

const CenterScopeContext = createContext<CenterScopeState | null>(null);

function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

export function CenterScopeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sectionId = searchParams.get("section") ?? "all";
  const rosterQ = searchParams.get("q") ?? "";
  const guardianFilter = (searchParams.get("guardian") as RosterGuardianFilter) || "all";
  const scheduleDate = searchParams.get("date") ?? todayKst();

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || (k === "section" && v === "all")) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      const currentQs = searchParams.toString();
      if (qs === currentQs) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const value = useMemo(
    () => ({
      sectionId,
      setSectionId: (id: string) => patchParams({ section: id === "all" ? null : id }),
      rosterQ,
      setRosterQ: (q: string) => patchParams({ q: q || null }),
      guardianFilter,
      setGuardianFilter: (f: RosterGuardianFilter) =>
        patchParams({ guardian: f === "all" ? null : f }),
      scheduleDate,
      setScheduleDate: (d: string) => patchParams({ date: d }),
    }),
    [sectionId, rosterQ, guardianFilter, scheduleDate, patchParams],
  );

  return <CenterScopeContext.Provider value={value}>{children}</CenterScopeContext.Provider>;
}

export function useCenterScope(): CenterScopeState {
  const ctx = useContext(CenterScopeContext);
  if (!ctx) {
    return {
      sectionId: "all",
      setSectionId: () => {},
      rosterQ: "",
      setRosterQ: () => {},
      guardianFilter: "all",
      setGuardianFilter: () => {},
      scheduleDate: todayKst(),
      setScheduleDate: () => {},
    };
  }
  return ctx;
}
