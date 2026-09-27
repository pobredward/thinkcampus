"use client";

/**
 * 프로그램 하나 — api.guardian.getProgramBundle(studentId, programRunId)
 * 같은 프로그램의 다른 회차로 옮겨 가도(페이지 재마운트) 깜빡이지 않도록 마지막 결과를 services/cache 에 둔다.
 * 서버에 프로그램이 없으면 더미 프로그램으로 화면을 채운다 (fromServer=false).
 */

import { useCallback, useEffect, useState } from "react";
import type { Program } from "@/data/dummyProgram";
import { getDummyProgram } from "@/data/programView";
import { useApi } from "@/services";
import { cacheGet, cacheSet } from "@/services/cache";

interface Loaded {
  program: Program | null;
  fromServer: boolean;
}

export function useProgramBundle(programRunId: string | null | undefined, studentId?: string | null) {
  const api = useApi();
  const key = `bundle|${studentId ?? ""}|${programRunId ?? ""}`;
  const cached = cacheGet<Loaded>(key);
  const [state, setState] = useState<Loaded | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);

  const load = useCallback(async () => {
    if (!programRunId) {
      setState({ program: null, fromServer: false });
      setLoading(false);
      return;
    }
    if (!studentId) {
      setState({ program: getDummyProgram(programRunId), fromServer: false });
      setLoading(false);
      return;
    }
    if (!cacheGet(key)) setLoading(true);
    let next: Loaded;
    try {
      const bundle = await api.guardian.getProgramBundle(studentId, programRunId);
      next = bundle ? { program: bundle.program, fromServer: true } : { program: getDummyProgram(programRunId), fromServer: false };
    } catch {
      next = { program: getDummyProgram(programRunId), fromServer: false };
    }
    cacheSet(key, next);
    setState(next);
    setLoading(false);
  }, [programRunId, studentId, api, key]);

  useEffect(() => {
    void load();
  }, [load]);

  return { program: state?.program ?? null, loading, fromServer: state?.fromServer ?? false, refetch: load };
}
