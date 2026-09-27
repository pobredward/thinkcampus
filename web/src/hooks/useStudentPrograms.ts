"use client";

/**
 * 자녀의 수강 목록 — api.guardian.listProgramBundles(studentId)
 * (실서비스: Callable listStudentProgramBundles 가 run + sessions 를 조립)
 */

import { useCallback, useEffect, useState } from "react";
import { useApi, type GuardianProgramBundle } from "@/services";
import { cacheGet, cacheSet } from "@/services/cache";

export type StudentProgramBundle = GuardianProgramBundle;

export function useStudentPrograms(studentId: string | null | undefined) {
  const api = useApi();
  const key = `bundles|${studentId ?? ""}`;
  const cached = studentId ? cacheGet<StudentProgramBundle[]>(key) : undefined;
  const [bundles, setBundles] = useState<StudentProgramBundle[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const fetchPrograms = useCallback(async () => {
    if (!studentId) {
      setBundles([]);
      setLoading(false);
      return;
    }
    if (!cacheGet(key)) setLoading(true);
    setError(null);
    try {
      const list = await api.guardian.listProgramBundles(studentId);
      cacheSet(key, list);
      setBundles(list);
    } catch (e) {
      setError((e as Error).message);
      setBundles([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, api, key]);

  useEffect(() => {
    void fetchPrograms();
  }, [fetchPrograms]);

  const completed = bundles.filter((b) => b.status === "completed");

  return { bundles, completed, loading, error, refetch: fetchPrograms };
}
