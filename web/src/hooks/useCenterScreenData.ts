"use client";

import { useMemo } from "react";
import {
  DEMO_CENTER_GUARDIANS,
  DEMO_CENTER_INSTRUCTORS,
  DEMO_CENTER_LESSONS,
  DEMO_CENTER_NOTIFICATIONS,
  DEMO_CENTER_REPORT_QUEUE,
  DEMO_CENTER_STUDENT_ROWS,
} from "@/lib/demoCenterOps";
import type { CenterRunOps } from "@/lib/centerRunOps";
import { useCenterRunOps } from "@/hooks/useCenterRunOps";
import { useCenterRun } from "@/providers/CenterRunProvider";

function demoOpsForRun(programRunId: string, contractCode: string): CenterRunOps {
  const lessons = DEMO_CENTER_LESSONS;
  const pending = lessons.filter((l) => l.attendanceRate < 1).length;
  const unlinked = DEMO_CENTER_GUARDIANS.filter((g) => g.guardians.length === 0).length;
  return {
    programRunId,
    contractCode,
    campusId: "campus-ds26",
    dashboard: {
      sessionsToday: 0,
      attendancePendingSessions: pending,
      reportsPendingReview: DEMO_CENTER_REPORT_QUEUE.filter((r) => r.status === "centerReviewed").length,
      studentsWithoutGuardian: unlinked,
      sessionsWithoutInstructor: 0,
    },
    lessons,
    students: DEMO_CENTER_STUDENT_ROWS,
    guardians: DEMO_CENTER_GUARDIANS,
    instructors: DEMO_CENTER_INSTRUCTORS,
    reports: DEMO_CENTER_REPORT_QUEUE.map((r) => ({
      id: r.id,
      sessionNumber: r.sessionNumber,
      studentName: r.studentName,
      status: r.status,
      instructorName: r.instructorName,
      submittedAt: r.submittedAt,
    })),
    notifications: DEMO_CENTER_NOTIFICATIONS.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      sentAt: n.sentAt,
      channel: n.channel,
    })),
  };
}

export function useCenterScreenData() {
  const { selectedRun } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, reload, isDemo } = useCenterRunOps(runId);

  const demoData = useMemo(() => {
    if (!isDemo || !selectedRun) return null;
    return demoOpsForRun(selectedRun.id, selectedRun.contractCode);
  }, [isDemo, selectedRun]);

  const ops = isDemo ? demoData : data;

  return {
    ops,
    loading: isDemo ? false : loading,
    error: isDemo ? null : error,
    reload,
    isDemo,
    hasRun: Boolean(selectedRun),
  };
}
