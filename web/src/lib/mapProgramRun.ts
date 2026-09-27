/**
 * Firestore programRuns + runSessions (+ sessionTemplates 내용 · 강사) → 앱 Program 타입
 * Callable listStudentProgramBundles 의 응답 (functions/src/listStudentProgramBundles.ts) 과 필드를 맞춘다.
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
  /** 운영 건 이름 (없으면 "지자체 계약코드") */
  title?: string;
  subtitle?: string;
  category?: string;
  targetGrade?: string;
  overview?: string;
  purpose?: string;
  features?: string[];
  commonMaterials?: string[];
  notices?: string[];
  faq?: Program["faq"];
  directions?: Program["directions"];
}

export interface FirestoreSessionContent {
  description?: string;
  objectives?: string[];
  teachingMethod?: string;
  curriculum?: string[];
  materials?: string[];
  rotationNote?: string;
  programCode?: string;
  planUrl?: string;
  lessonPlans?: Session["lessonPlans"];
  qna?: Session["qna"];
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
  sectionId?: string;
  instructorId?: string | null;
  instructor?: { name: string; title: string; bio: string };
  content?: FirestoreSessionContent;
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
  const c = rs.content ?? {};
  return {
    id: rs.id,
    sessionNumber: rs.sessionNumber,
    date: ymdToDotWithWeekday(rs.scheduledDate),
    startTime: rs.startTime,
    endTime: rs.endTime,
    durationMinutes: hours * 40,
    sessionHours: hours,
    topic: rs.topic,
    programCode: c.programCode,
    description: rs.overrides?.description ?? c.description ?? "",
    objectives: c.objectives,
    teachingMethod: c.teachingMethod,
    instructor: rs.instructor ?? { name: "배정 예정", title: "", bio: "" },
    curriculum: c.curriculum ?? [],
    lessonPlans: c.lessonPlans,
    planUrl: c.planUrl,
    materials: c.materials ?? [],
    location: rs.location,
    rotationNote: c.rotationNote,
    isCancelled: rs.status === "cancelled",
    cancelReason: rs.cancelReason,
    qna: c.qna,
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
  if (run.status === "scheduled" && status === "active") status = "upcoming";
  if (run.status === "completed") status = "completed";

  const title = run.title?.trim() || `${run.municipalityName} ${run.contractCode}`;
  const first = sorted[0];

  return {
    id: runId,
    campusId: run.campusId,
    title,
    subtitle: run.subtitle ?? "",
    category: run.category ?? "",
    contractCode: run.contractCode,
    startDate: startDot,
    endDate: endDot,
    fixedDay,
    frequency: run.frequency,
    startTime: first?.startTime ?? run.startTime,
    endTime: first?.endTime ?? run.endTime,
    sessionHours: first?.lessonCount ?? 3,
    totalSessions: sorted.length,
    totalHours,
    location: run.location,
    targetGrade: run.targetGrade ?? "",
    maxStudents: 0,
    status,
    overview: run.overview,
    purpose: run.purpose,
    features: run.features,
    commonMaterials: run.commonMaterials,
    notices: run.notices,
    faq: run.faq,
    mapQuery: run.mapQuery,
    host: run.host,
    directions: run.directions,
    sessions: sorted.map(mapSession),
  };
}
