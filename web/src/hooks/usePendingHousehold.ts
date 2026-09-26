"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { useGuardianDemoData } from "@/hooks/useDemoExperience";
import { getFns } from "@/lib/firebase";

export interface PendingHouseholdMember {
  studentId: string;
  maskedName: string;
}

export function usePendingHousehold(enabled: boolean) {
  const guardianDemo = useGuardianDemoData();
  const [pending, setPending] = useState<PendingHouseholdMember[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!enabled || guardianDemo) {
      setPending([]);
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable<Record<string, never>, { pending: PendingHouseholdMember[] }>(
        getFns(),
        "listPendingHouseholdMembers",
      );
      const res = await fn({});
      setPending(res.data.pending ?? []);
    } catch {
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, guardianDemo]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { pending, loading, refetch };
}
