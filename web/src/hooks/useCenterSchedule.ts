"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import type { CenterScheduleDay } from "@/lib/centerSchedule";
import { buildDemoScheduleToday } from "@/lib/demoCenterScale";
import { DEMO_INSTRUCTOR_PROFILES, readDemoAssignments } from "@/lib/demoInstructorStaff";
import { getFns } from "@/lib/firebase";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { useAuth } from "@/providers/AuthProvider";

export function useCenterSchedule(
  programRunId: string | null | undefined,
  dateFrom: string,
  dateTo?: string,
) {
  const { active, role } = useDemoPortal();
  const { user } = useAuth();
  const isDemo = active && role === "center";

  const [days, setDays] = useState<CenterScheduleDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!programRunId) {
      setDays([]);
      return;
    }
    if (isDemo) {
      const map = typeof window !== "undefined" ? readDemoAssignments() : {};
      const raw = buildDemoScheduleToday(dateFrom);
      const days = raw.map((day) => ({
        ...day,
        slots: day.slots.map((slot) => ({
          ...slot,
          sessions: slot.sessions.map((s) => {
            const assigned = map[s.id] ?? s.instructorId ?? null;
            const prof = assigned ? DEMO_INSTRUCTOR_PROFILES.find((p) => p.staffId === assigned) : undefined;
            return {
              ...s,
              instructorId: assigned,
              instructorName: prof?.name ?? s.instructorName,
            };
          }),
        })),
      }));
      setDays(days);
      setLoading(false);
      return;
    }
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<
        { programRunId: string; dateFrom?: string; dateTo?: string },
        { days: CenterScheduleDay[] }
      >(getFns(), "listCenterSchedule");
      const res = await fn({
        programRunId,
        dateFrom,
        dateTo: dateTo ?? dateFrom,
      });
      setDays(res.data.days);
    } catch (e) {
      setDays([]);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [programRunId, dateFrom, dateTo, isDemo, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { days, loading, error, reload, isDemo };
}
