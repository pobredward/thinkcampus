"use client";

/**
 * 센터 앱의 "지금 보고 있는 운영 건" — 헤더에서 고르고, 모든 센터 화면이 같은 값을 쓴다.
 * 선택은 이 탭(sessionStorage)에 남긴다. 목록에 없으면 첫 번째(진행 중) 운영 건.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApi, useQuery, type CenterRunSummary, type ProgramRunSummaryDto } from "@/services";

const KEY = "tc.center.run";

interface CenterRunState {
  runs: ProgramRunSummaryDto[];
  runsLoading: boolean;
  runsError: string | null;
  selectedRun: ProgramRunSummaryDto | null;
  selectRun: (id: string) => void;
  summary: CenterRunSummary | null;
  summaryLoading: boolean;
  refetch: () => Promise<void>;
}

const Ctx = createContext<CenterRunState>({
  runs: [],
  runsLoading: true,
  runsError: null,
  selectedRun: null,
  selectRun: () => {},
  summary: null,
  summaryLoading: true,
  refetch: async () => {},
});

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function CenterRunProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { data: runs, loading: runsLoading, error: runsError, refetch: refetchRuns } = useQuery(() => api.center.listRuns(), [api]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId === null) setSelectedId(readStored());
  }, [selectedId]);

  const selectedRun = useMemo(() => {
    if (!runs || runs.length === 0) return null;
    return runs.find((r) => r.id === selectedId) ?? runs[0];
  }, [runs, selectedId]);

  const selectRun = useCallback((id: string) => {
    setSelectedId(id);
    try {
      window.sessionStorage.setItem(KEY, id);
    } catch {
      /* noop */
    }
  }, []);

  const runId = selectedRun?.id ?? null;
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useQuery(
    () => (runId ? api.center.getRunSummary(runId) : null),
    [api, runId],
  );

  const refetch = useCallback(async () => {
    await Promise.all([refetchRuns(), refetchSummary()]);
  }, [refetchRuns, refetchSummary]);

  const value = useMemo<CenterRunState>(
    () => ({
      runs: runs ?? [],
      runsLoading,
      runsError,
      selectedRun,
      selectRun,
      summary: summary ?? null,
      summaryLoading: summaryLoading && !summary,
      refetch,
    }),
    [runs, runsLoading, runsError, selectedRun, selectRun, summary, summaryLoading, refetch],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCenterRun(): CenterRunState {
  return useContext(Ctx);
}
