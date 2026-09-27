"use client";

/**
 * 종합 리포트 — api.guardian.getFinalReport(studentId, programRunId). 아직 발급 전이면 null.
 */

import { useCallback, useEffect, useState } from "react";
import type { StudentReport } from "@/data/dummyReport";
import { useApi } from "@/services";
import { cacheGet, cacheSet } from "@/services/cache";

export function useFinalReport(studentId: string | null | undefined, programRunId: string | null | undefined) {
  const api = useApi();
  const key = `finalReport|${studentId ?? ""}|${programRunId ?? ""}`;
  const cached = cacheGet<{ report: StudentReport | null }>(key);
  const [report, setReport] = useState<StudentReport | null>(cached?.report ?? null);
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async () => {
    if (!studentId || !programRunId) {
      setReport(null);
      setLoading(false);
      return;
    }
    if (!cacheGet(key)) setLoading(true);
    try {
      const r = await api.guardian.getFinalReport(studentId, programRunId);
      cacheSet(key, { report: r });
      setReport(r);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [studentId, programRunId, api, key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { report, loading, refetch: load };
}
