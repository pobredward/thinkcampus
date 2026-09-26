/**
 * Firestore programRuns + runSessions → 앱 Program 타입
 */

import type { Program, Session } from "@/data/dummyProgram";
import { WEEKDAYS } from "@/lib/dates";

export interface FirestoreProgramRun {
  contractCode: string;
  programTemplateId: string;
  campusId: string;
  municipalityName: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  frequency: "weekly" | "biweekly";
  fixedDay: number;
  startTime: string;
  endTime: string;
  location: string;
  mapQuery?: string;
  host?: string;
  logoUrl?: string;
}

export interface FirestoreRunSession {
  programRunId: string;
  sessionNumber: number;
  sessionTemplateId: string;
  topic: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  location: string;
  status: string;
  cancelReason?: string;
  overrides?: { description?: string };
}

function ymdToDotWithWeekday(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const wd = WEEKDAYS[date.getDay()];
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}.${mm}.${dd} (${wd})`;
}

function mapSession(rs: FirestoreRunSession & { id: string }): Session {
  const hours = rs.lessonCount;
  return {
    id: rs.id,
    sessionNumber: rs.sessionNumber,
    date: ymdToDotWithWeekday(rs.scheduledDate),
    startTime: rs.startTime,
    endTime: rs.endTime,
    durationMinutes: hours * 40,
    sessionHours: hours,
    topic: rs.topic,
    description: rs.overrides?.description ?? "",
    instructor: { name: "배정 예정", title: "", bio: "" },
    curriculum: [],
    materials: [],
    location: rs.location,
    isCancelled: rs.status === "cancelled",
    cancelReason: rs.cancelReason,
  };
}

export function mapProgramRunToProgram(
  runId: string,
  run: FirestoreProgramRun,
  sessions: Array<FirestoreRunSession & { id: string }>,
  enrollmentStatus?: string,
): Program {
  const sorted = [...sessions].sort((a, b) => a.sessionNumber - b.sessionNumber);
  const totalHours = sorted.reduce((acc, s) => acc + s.lessonCount, 0);
  const fixedDay = WEEKDAYS[run.fixedDay] ?? "토";
  const startDot = run.startDate.replace(/-/g, ".");
  const endDot = run.endDate ? run.endDate.replace(/-/g, ".") : startDot;

  let status: Program["status"] = "active";
  if (enrollmentStatus === "upcoming") status = "upcoming";
  if (enrollmentStatus === "completed") status = "completed";
  if (run.status === "scheduled") status = "upcoming";

  const title = `${run.municipalityName} ${run.contractCode}`;

  return {
    id: runId,
    campusId: run.campusId,
    title,
    subtitle: run.programTemplateId,
    category: "",
    contractCode: run.contractCode,
    startDate: startDot,
    endDate: endDot,
    fixedDay,
    frequency: run.frequency,
    startTime: run.startTime,
    endTime: run.endTime,
    sessionHours: sorted[0]?.lessonCount ?? 3,
    totalSessions: sorted.length,
    totalHours,
    location: run.location,
    targetGrade: "",
    maxStudents: 0,
    status,
    mapQuery: run.mapQuery,
    host: run.host,
    sessions: sorted.map(mapSession),
  };
}
