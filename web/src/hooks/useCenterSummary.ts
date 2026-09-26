"use client";

import { useCallback, useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import type { CenterRunSummary } from "@/lib/centerSummary";
import { buildDemoSections, buildDemoScheduleDates } from "@/lib/demoCenterScale";
import { DEMO_CENTER_REPORT_QUEUE } from "@/lib/demoCenterOps";
import { getFns } from "@/lib/firebase";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { useAuth } from "@/providers/AuthProvider";

export function useCenterSummary(programRunId: string | null | undefined) {
  const { active, role } = useDemoPortal();
  const { user } = useAuth();
  const isDemo = active && role === "center";

  const [data, setData] = useState<CenterRunSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!programRunId) {
      setData(null);
      return;
    }
    if (isDemo) {
      const sections = buildDemoSections(72);
      setData({
        programRunId,
        contractCode: "DG-2026-STEM",
        campusId: "campus-ds26",
        sections,
        scheduleDates: buildDemoScheduleDates(),
        dashboard: {
          totalStudents: 72,
          sectionsActive: sections.length,
          sessionsToday: 6,
          parallelSlotsToday: 3,
          attendancePendingSessions: 4,
          reportsPendingReview: DEMO_CENTER_REPORT_QUEUE.filter((r) => r.status === "centerReviewed").length,
          studentsWithoutGuardian: 6,
          sessionsWithoutInstructor: 0,
        },
      });
      setLoading(false);
      setError(null);
      return;
    }
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ programRunId: string }, CenterRunSummary>(getFns(), "getCenterRunSummary");
      const res = await fn({ programRunId });
      setData(res.data);
    } catch (e) {
      setData(null);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isDemo, programRunId, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, reload, isDemo };
}
