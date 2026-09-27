"use client";

/**
 * 직원 권한 — useApi().staff.checkAccess()
 * 체험이면 역할에 맞는 권한이, 실서비스면 Custom Claims(checkStaffAccess)가 온다.
 */

import { useCallback, useEffect, useState } from "react";
import { EMPTY_STAFF_ACCESS, type StaffAccess } from "@/lib/staffAccess";
import { useApi } from "@/services";

export type { StaffAccess } from "@/lib/staffAccess";

export function useStaffAccess(userId: string | null | undefined) {
  const api = useApi();
  const [access, setAccess] = useState<StaffAccess>(EMPTY_STAFF_ACCESS);
  const [checking, setChecking] = useState(true);

  const recheck = useCallback(async () => {
    if (!userId) {
      setAccess(EMPTY_STAFF_ACCESS);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      setAccess(await api.staff.checkAccess());
    } catch {
      setAccess(EMPTY_STAFF_ACCESS);
    } finally {
      setChecking(false);
    }
  }, [userId, api]);

  useEffect(() => {
    void recheck();
  }, [recheck]);

  return { access, checking, recheck };
}
