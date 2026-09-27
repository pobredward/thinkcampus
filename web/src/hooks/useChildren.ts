"use client";

/**
 * 보호자에게 연결된 자녀 목록 — api.guardian.listChildren()
 * (실서비스: guardianLinks(guardianUid) → students / campuses, 모바일 홈/내 정보 화면의 fetchChildren 과 동일)
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useApi, type ChildDto } from "@/services";

export type Child = ChildDto;

export function useChildren(opts?: { activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? false;
  const api = useApi();
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid;

  const fetchChildren = useCallback(
    async (isRefresh = false) => {
      if (!uid) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setChildren(await api.guardian.listChildren({ activeOnly }));
      } catch (e) {
        console.warn("자녀 목록 조회 실패:", (e as Error).message);
        setError((e as Error).message ?? "자녀 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid, activeOnly, api],
  );

  useEffect(() => {
    if (uid) void fetchChildren();
  }, [uid, fetchChildren]);

  return { children, loading, refreshing, error, refresh: () => fetchChildren(true) };
}
