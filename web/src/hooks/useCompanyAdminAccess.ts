"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { DEMO_MODE } from "@/lib/demo";
import { getFns } from "@/lib/firebase";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

export function useCompanyAdminAccess(userId: string | null | undefined) {
  const { active, role } = useDemoPortal();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  const recheck = useCallback(async () => {
    if (active && role === "company") {
      setAllowed(true);
      setChecking(false);
      return;
    }
    if (!userId || DEMO_MODE) {
      setAllowed(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const fn = httpsCallable<Record<string, never>, { allowed: boolean }>(
        getFns(),
        "checkCompanyAdminAccess",
      );
      const res = await fn({});
      setAllowed(Boolean(res.data.allowed));
    } catch {
      setAllowed(false);
    } finally {
      setChecking(false);
    }
  }, [userId, active, role]);

  useEffect(() => {
    void recheck();
  }, [recheck]);

  return { allowed, checking, recheck };
}
