"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi, type PendingHouseholdMember } from "@/services";

export type { PendingHouseholdMember };

/** 같은 가구인데 아직 내 계정에 연결되지 않은 자녀 (형제 연동 안내) */
export function usePendingHousehold(enabled: boolean) {
  const api = useApi();
  const [pending, setPending] = useState<PendingHouseholdMember[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setPending([]);
      return;
    }
    setLoading(true);
    try {
      setPending(await api.guardian.listPendingHousehold());
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, api]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { pending, loading, refetch };
}
