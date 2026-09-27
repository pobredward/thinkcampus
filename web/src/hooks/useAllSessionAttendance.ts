"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi, type AttendanceRecordDto } from "@/services";
import { cacheGet, cacheSet } from "@/services/cache";

type Grouped = Record<string, AttendanceRecordDto[]>;

/** 학생의 전체 출결 — programRunId별 그룹 (홈 카드 진도용) */
export function useAllSessionAttendance(studentId: string | null | undefined, enabled: boolean) {
  const api = useApi();
  const key = `attendanceAll|${studentId ?? ""}`;
  const cached = enabled && studentId ? cacheGet<Grouped>(key) : undefined;
  const [byProgramRunId, setByProgramRunId] = useState<Grouped>(cached ?? {});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !studentId) {
      setByProgramRunId({});
      setLoading(false);
      return;
    }
    if (!cacheGet(key)) setLoading(true);
    try {
      const records = await api.guardian.listAttendance(studentId);
      const grouped: Grouped = {};
      for (const r of records) {
        if (!r.programRunId) continue;
        (grouped[r.programRunId] ??= []).push(r);
      }
      cacheSet(key, grouped);
      setByProgramRunId(grouped);
    } catch {
      setByProgramRunId({});
    } finally {
      setLoading(false);
    }
  }, [enabled, studentId, api, key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { byProgramRunId, loading, refetch: load };
}
