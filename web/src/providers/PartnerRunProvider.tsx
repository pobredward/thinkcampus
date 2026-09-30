"use client";

/**
 * 발주처 포털의 "지금 보고 있는 운영 건" — 헤더에서 고르고, 모든 /partner 화면이 같은 값을 쓴다.
 * 선택은 이 탭(sessionStorage)에 남긴다. 목록에 없으면 첫 번째(운영 중) 운영 건.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useApi, useQuery, type PartnerRunOption } from "@/services";

const KEY = "tc.partner.run";

interface PartnerRunState {
  runs: PartnerRunOption[];
  runsLoading: boolean;
  runsError: string | null;
  selectedRun: PartnerRunOption | null;
  selectRun: (id: string) => void;
}

const Ctx = createContext<PartnerRunState>({ runs: [], runsLoading: true, runsError: null, selectedRun: null, selectRun: () => {} });

export function PartnerRunProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();
  const { data: runs, loading, error } = useQuery(() => api.partner.listRuns(), [api]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId !== null) return;
    try {
      setSelectedId(window.sessionStorage.getItem(KEY) ?? "");
    } catch {
      setSelectedId("");
    }
  }, [selectedId]);

  const selectRun = useCallback((id: string) => {
    setSelectedId(id);
    try {
      window.sessionStorage.setItem(KEY, id);
    } catch {
      /* noop */
    }
  }, []);

  const selectedRun = useMemo(() => {
    if (!runs || runs.length === 0) return null;
    return runs.find((r) => r.id === selectedId) ?? runs[0];
  }, [runs, selectedId]);

  const value = useMemo<PartnerRunState>(
    () => ({ runs: runs ?? [], runsLoading: loading && !runs, runsError: error, selectedRun, selectRun }),
    [runs, loading, error, selectedRun, selectRun],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePartnerRun(): PartnerRunState {
  return useContext(Ctx);
}
