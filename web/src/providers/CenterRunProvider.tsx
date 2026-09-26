"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { DEMO_CENTER_RUNS } from "@/lib/demoPortal";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { getDb } from "@/lib/firebase";

export interface CenterRunOption {
  id: string;
  contractCode: string;
  campusId: string;
  municipalityName: string;
  campusName?: string;
}

interface CenterRunState {
  runs: CenterRunOption[];
  runsLoading: boolean;
  selectedRunId: string;
  selectedRun: CenterRunOption | null;
  setSelectedRunId: (id: string) => void;
}

const CenterRunContext = createContext<CenterRunState | null>(null);

export function CenterRunProvider({
  runs,
  runsLoading = false,
  children,
}: {
  runs: CenterRunOption[];
  runsLoading?: boolean;
  children: React.ReactNode;
}) {
  const [selectedRunId, setSelectedRunId] = useState(runs[0]?.id ?? "");

  useEffect(() => {
    if (runs.length === 0) {
      setSelectedRunId("");
      return;
    }
    if (!runs.some((r) => r.id === selectedRunId)) {
      setSelectedRunId(runs[0].id);
    }
  }, [runs, selectedRunId]);

  const selectedRun = runs.find((r) => r.id === selectedRunId) ?? runs[0] ?? null;

  const value = useMemo(
    () => ({ runs, runsLoading, selectedRunId, selectedRun, setSelectedRunId }),
    [runs, runsLoading, selectedRunId, selectedRun],
  );

  return <CenterRunContext.Provider value={value}>{children}</CenterRunContext.Provider>;
}

function LiveCenterRunProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { access } = useStaffAccess(user?.uid ?? null);
  const [runs, setRuns] = useState<CenterRunOption[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!user || !access.allowed) {
        setRuns([]);
        setRunsLoading(false);
        return;
      }
      setRunsLoading(true);
      try {
        const db = getDb();
        const snap = access.companyAdmin
          ? await getDocs(collection(db, "programRuns"))
          : access.campusIds.length === 0
            ? { docs: [] as Awaited<ReturnType<typeof getDocs>>["docs"] }
            : await getDocs(
                query(
                  collection(db, "programRuns"),
                  where("campusId", "in", access.campusIds.slice(0, 10)),
                ),
              );
        if (cancelled) return;
        const campusNames = new Map<string, string>();
        const campusIds = [
          ...new Set(
            snap.docs.map((d) => {
              const row = d.data() as Record<string, unknown>;
              return (row.campusId as string) || "";
            }),
          ),
        ].filter(Boolean);
        await Promise.all(
          campusIds.map(async (cid) => {
            const cSnap = await getDoc(doc(db, "campuses", cid));
            if (cSnap.exists()) {
              const cData = cSnap.data() as Record<string, unknown>;
              campusNames.set(cid, (cData.name as string) || cid);
            }
          }),
        );
        const list: CenterRunOption[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          const campusId = (data.campusId as string) ?? "";
          return {
            id: d.id,
            contractCode: (data.contractCode as string) ?? d.id,
            campusId,
            municipalityName: (data.municipalityName as string) ?? "",
            campusName: campusNames.get(campusId) ?? campusId,
          };
        });
        list.sort((a, b) => a.contractCode.localeCompare(b.contractCode, "ko"));
        setRuns(list);
      } catch {
        if (!cancelled) setRuns([]);
      } finally {
        if (!cancelled) setRunsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, access.allowed, access.companyAdmin, access.campusIds]);

  return (
    <CenterRunProvider runs={runs} runsLoading={runsLoading}>
      {children}
    </CenterRunProvider>
  );
}

export function DemoCenterRunProvider({ children }: { children: React.ReactNode }) {
  const { role, active } = useDemoPortal();
  const demoRuns: CenterRunOption[] =
    active && role === "center"
      ? DEMO_CENTER_RUNS.map((r) => ({ ...r, campusName: "달성캠퍼스" }))
      : [];

  if (active && role === "center") {
    return <CenterRunProvider runs={demoRuns}>{children}</CenterRunProvider>;
  }

  return <LiveCenterRunProvider>{children}</LiveCenterRunProvider>;
}

export function useCenterRun(): CenterRunState {
  const ctx = useContext(CenterRunContext);
  if (!ctx) {
    return {
      runs: [],
      runsLoading: false,
      selectedRunId: "",
      selectedRun: null,
      setSelectedRunId: () => {},
    };
  }
  return ctx;
}
