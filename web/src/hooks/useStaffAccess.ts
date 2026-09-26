"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { DEMO_MODE } from "@/lib/demo";
import { demoStaffAccess } from "@/lib/demoPortal";
import { getFns } from "@/lib/firebase";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import type { StaffAccess } from "@/lib/staffAccess";

export type { StaffAccess } from "@/lib/staffAccess";

const EMPTY: StaffAccess = {
  allowed: false,
  companyAdmin: false,
  centerAdmin: false,
  campusIds: [],
};

export function useStaffAccess(userId: string | null | undefined) {
  const { active, role } = useDemoPortal();
  const [access, setAccess] = useState<StaffAccess>(EMPTY);
  const [checking, setChecking] = useState(true);

  const recheck = useCallback(async () => {
    if (active && (role === "company" || role === "center")) {
      setAccess(demoStaffAccess(role));
      setChecking(false);
      return;
    }
    if (!userId || DEMO_MODE) {
      setAccess(EMPTY);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const fn = httpsCallable<Record<string, never>, StaffAccess>(getFns(), "checkStaffAccess");
      const res = await fn({});
      setAccess(res.data);
    } catch {
      setAccess(EMPTY);
    } finally {
      setChecking(false);
    }
  }, [userId, active, role]);

  useEffect(() => {
    void recheck();
  }, [recheck]);

  return { access, checking, recheck };
}
