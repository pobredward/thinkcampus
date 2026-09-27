"use client";

/**
 * useQuery / useMutation — 화면에서 데이터 계층을 쓰는 작은 훅
 *
 *   const { data, loading, error, refetch } = useQuery(() => api.center.listRuns(), [api]);
 *   const save = useMutation(async (input) => api.center.recordAttendance(input));
 *
 * - fetcher 가 null 을 돌려주면 조회하지 않는다 (아직 파라미터가 없을 때)
 * - 저장(useMutation)이 끝나면 화면의 모든 useQuery 가 다시 조회한다 (bump)
 * - 체험판 세계가 바뀌어도(다른 역할 화면에서 저장) 같은 방식으로 다시 조회한다
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { errMessage } from "@/lib/errors";
import { cacheClear } from "./cache";
import { subscribeDemoWorld } from "./demo/world";

// ── 데이터 버전 (저장 후 모든 조회를 새로 고친다) ──────────────

let version = 0;
const listeners = new Set<() => void>();

export function bumpDataVersion(): void {
  version++;
  cacheClear();
  listeners.forEach((l) => l());
}

// 체험 세계가 바뀌면(다른 역할 화면에서 저장) 조회 결과 캐시도 버린다
subscribeDemoWorld(() => cacheClear());

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const unsubWorld = subscribeDemoWorld(() => {
    version++;
    listener();
  });
  return () => {
    listeners.delete(listener);
    unsubWorld();
  };
}

function useDataVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}

// ── useQuery ─────────────────────────────────────────────

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useQuery<T>(fetcher: () => Promise<T> | null, deps: unknown[]): QueryState<T> {
  const dataVersion = useDataVersion();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(async (silent: boolean) => {
    const my = ++seq.current;
    const p = fetcherRef.current();
    if (!p) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const result = await p;
      if (my !== seq.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (my !== seq.current) return;
      setError(errMessage(e));
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, []);

  // 파라미터가 바뀌면 처음부터, 데이터 버전이 바뀌면 조용히 다시 조회
  const depsKey = JSON.stringify(deps.map((d) => (typeof d === "function" ? "fn" : d)));
  const lastDeps = useRef<string | null>(null);
  useEffect(() => {
    const changed = lastDeps.current !== depsKey;
    lastDeps.current = depsKey;
    void run(!changed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey, dataVersion]);

  const refetch = useCallback(() => run(true), [run]);
  return { data, loading, error, refetch };
}

// ── useMutation ──────────────────────────────────────────

export interface MutationState<A extends unknown[], R> {
  run: (...args: A) => Promise<R>;
  pending: boolean;
  error: string | null;
  reset: () => void;
}

export function useMutation<A extends unknown[], R>(fn: (...args: A) => Promise<R>): MutationState<A, R> {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  const run = useCallback(async (...args: A): Promise<R> => {
    setPending(true);
    setError(null);
    try {
      const r = await fnRef.current(...args);
      bumpDataVersion();
      return r;
    } catch (e) {
      setError(errMessage(e));
      throw e;
    } finally {
      setPending(false);
    }
  }, []);

  return { run, pending, error, reset: () => setError(null) };
}
