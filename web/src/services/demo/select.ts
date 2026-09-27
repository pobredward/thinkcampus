/**
 * 체험 세계에서 화면용 DTO 를 만드는 공통 조회 (Functions 의 lib/centerRunHelpers 에 해당)
 */

import type { Program, Session } from "@/data/dummyProgram";
import { WEEKDAYS } from "@/lib/dates";
import type {
  AttendanceRecordDto,
  InstructorSessionDto,
  ProgramRunSummaryDto,
  ProgramSectionDto,
  SessionReportRow,
} from "@/services/types";
import type { DemoRun, DemoRunSession, DemoStaff, DemoTemplate, DemoTemplateSession, DemoWorld } from "./world";

export function runById(w: DemoWorld, id: string): DemoRun {
  const run = w.runs.find((r) => r.id === id);
  if (!run) throw new Error("운영 건을 찾을 수 없습니다.");
  return run;
}

export function templateOf(w: DemoWorld, run: DemoRun): DemoTemplate {
  const tpl = w.templates.find((t) => t.id === run.programTemplateId);
  if (!tpl) throw new Error("프로그램 템플릿을 찾을 수 없습니다.");
  return tpl;
}

export function sessionTemplateOf(w: DemoWorld, rs: DemoRunSession): DemoTemplateSession | undefined {
  const run = w.runs.find((r) => r.id === rs.programRunId);
  if (!run) return undefined;
  return templateOf(w, run).sessions.find((s) => s.id === rs.sessionTemplateId);
}

export function staffById(w: DemoWorld, uid: string | null | undefined): DemoStaff | undefined {
  if (!uid) return undefined;
  return w.staff.find((s) => s.uid === uid);
}

export function instructorName(w: DemoWorld, uid: string | null | undefined): string | undefined {
  return staffById(w, uid)?.displayName;
}

export function sectionLabel(run: DemoRun, sectionId: string): string {
  return run.sections.find((s) => s.id === sectionId)?.label ?? "반 미정";
}

export function campusName(w: DemoWorld, campusId: string): string {
  return w.campuses.find((c) => c.id === campusId)?.name ?? campusId;
}

export function runSessionById(w: DemoWorld, id: string): DemoRunSession {
  const rs = w.runSessions.find((s) => s.id === id);
  if (!rs) throw new Error("회차를 찾을 수 없습니다.");
  return rs;
}

export function activeEnrollments(w: DemoWorld, programRunId: string, sectionId?: string) {
  return w.enrollments.filter(
    (e) => e.programRunId === programRunId && e.status !== "withdrawn" && (!sectionId || e.sectionId === sectionId),
  );
}

export function sectionDtos(w: DemoWorld, run: DemoRun): ProgramSectionDto[] {
  return [...run.sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      id: s.id,
      label: s.label,
      sortOrder: s.sortOrder,
      studentCount: activeEnrollments(w, run.id, s.id).length,
    }));
}

export function runSummaryDto(w: DemoWorld, run: DemoRun): ProgramRunSummaryDto {
  const tpl = templateOf(w, run);
  return {
    id: run.id,
    contractCode: run.contractCode,
    title: run.title,
    campusId: run.campusId,
    campusName: campusName(w, run.campusId),
    municipalityName: run.municipalityName,
    status: run.status,
    startDate: run.startDate,
    endDate: run.endDate,
    frequency: run.frequency,
    fixedDay: run.fixedDay,
    startTime: run.startTime,
    endTime: run.endTime,
    location: run.location,
    totalSessions: tpl.sessions.length,
    studentCount: activeEnrollments(w, run.id).length,
    sections: sectionDtos(w, run),
    reportPolicy: run.reportPolicy,
  };
}

/** 회차 집계: 수강 인원 · 출결 입력 수 · 리포트 제출(검수 대기 이상) 수 */
export function sessionCounts(w: DemoWorld, rs: DemoRunSession): { enrolledCount: number; recordedCount: number; reportedCount: number } {
  const enrolled = activeEnrollments(w, rs.programRunId, rs.sectionId);
  const ids = new Set(enrolled.map((e) => e.studentId));
  const recordedCount = w.attendance.filter((a) => a.runSessionId === rs.id && ids.has(a.studentId)).length;
  const reportedCount = w.reports.filter((r) => r.runSessionId === rs.id && ids.has(r.studentId) && r.status !== "draft").length;
  return { enrolledCount: enrolled.length, recordedCount, reportedCount };
}

export function ymdToDot(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${wd})`;
}

export function ymdToDotPlain(ymd: string): string {
  return ymd.replace(/-/g, ".");
}

/** 학부모 앱 Program — 학생이 속한 반의 회차만, 수업 내용은 템플릿에서, 강사는 배정된 직원에서 */
export function buildProgramForSection(
  w: DemoWorld,
  run: DemoRun,
  sectionId: string,
  enrollmentStatus: "active" | "upcoming" | "completed" | "withdrawn",
): Program {
  const tpl = templateOf(w, run);
  const sessions = w.runSessions
    .filter((rs) => rs.programRunId === run.id && rs.sectionId === sectionId)
    .sort((a, b) => a.sessionNumber - b.sessionNumber);
  const totalHours = sessions.reduce((acc, s) => acc + s.lessonCount, 0);
  const status: Program["status"] =
    enrollmentStatus === "completed" || run.status === "completed"
      ? "completed"
      : enrollmentStatus === "upcoming" || run.status === "scheduled"
        ? "upcoming"
        : "active";
  const first = sessions[0];

  const mapSession = (rs: DemoRunSession): Session => {
    const ts = tpl.sessions.find((t) => t.id === rs.sessionTemplateId);
    const staff = staffById(w, rs.instructorId);
    return {
      id: rs.id,
      sessionNumber: rs.sessionNumber,
      date: ymdToDot(rs.scheduledDate),
      startTime: rs.startTime,
      endTime: rs.endTime,
      durationMinutes: rs.lessonCount * 40,
      sessionHours: rs.lessonCount,
      topic: rs.topic,
      programCode: ts?.programCode,
      description: ts?.description ?? "",
      objectives: ts?.objectives,
      teachingMethod: ts?.teachingMethod,
      instructor: staff
        ? { name: staff.displayName, title: staff.title ?? "", bio: staff.bio ?? "" }
        : { name: "배정 예정", title: "", bio: "" },
      curriculum: ts?.curriculum ?? [],
      lessonPlans: ts?.lessonPlans,
      planUrl: ts?.planUrl,
      materials: ts?.materials ?? [],
      location: rs.location,
      rotationNote: ts?.rotationNote,
      isCancelled: rs.status === "cancelled",
      cancelReason: rs.cancelReason,
      qna: ts?.qna,
    };
  };

  return {
    id: run.id,
    campusId: run.campusId,
    title: run.title,
    subtitle: tpl.subtitle,
    category: tpl.category,
    contractCode: run.contractCode,
    startDate: ymdToDotPlain(run.startDate),
    endDate: ymdToDotPlain(run.endDate),
    fixedDay: WEEKDAYS[run.fixedDay] ?? "토",
    frequency: run.frequency,
    startTime: first?.startTime ?? run.startTime,
    endTime: first?.endTime ?? run.endTime,
    sessionHours: first?.lessonCount ?? 3,
    totalSessions: sessions.length,
    totalHours,
    location: run.location,
    targetGrade: tpl.targetGrade,
    maxStudents: tpl.maxStudents,
    status,
    enrolledAt: ymdToDotPlain(run.createdAt.slice(0, 10)),
    overview: tpl.overview,
    features: tpl.features,
    commonMaterials: tpl.commonMaterials,
    notices: run.notices,
    breaks: run.breaks,
    host: run.host,
    purpose: tpl.purpose,
    faq: tpl.faq,
    mapQuery: run.mapQuery,
    directions: run.directions,
    sessions: sessions.map(mapSession),
  };
}

/** 학부모에게 보이는 출결 + (공개된 경우) 리포트 피드백 */
export function attendanceRecordDtos(w: DemoWorld, studentId: string, programRunId?: string): AttendanceRecordDto[] {
  return w.attendance
    .filter((a) => a.studentId === studentId && (!programRunId || a.programRunId === programRunId))
    .map((a) => {
      const report = w.reports.find((r) => r.id === a.id && r.status === "published");
      return {
        runSessionId: a.runSessionId,
        programRunId: a.programRunId,
        studentId: a.studentId,
        status: a.status,
        lateMinutes: a.lateMinutes,
        checkinTime: a.checkinTime,
        participationScore: report?.participationScore ?? undefined,
        homeworkDone: report ? report.homeworkDone : undefined,
        feedback: report?.feedback || undefined,
        highlights: report?.highlights ?? [],
        improvements: report?.improvements ?? [],
      };
    });
}

export function reportRow(w: DemoWorld, reportId: string): SessionReportRow | null {
  const r = w.reports.find((x) => x.id === reportId);
  if (!r) return null;
  const rs = w.runSessions.find((s) => s.id === r.runSessionId);
  if (!rs) return null;
  const run = runById(w, rs.programRunId);
  const student = w.students.find((s) => s.id === r.studentId);
  const att = w.attendance.find((a) => a.id === r.id);
  return {
    id: r.id,
    runSessionId: rs.id,
    programRunId: rs.programRunId,
    studentId: r.studentId,
    studentName: student?.name ?? r.studentId,
    sectionLabel: sectionLabel(run, rs.sectionId),
    sessionNumber: rs.sessionNumber,
    scheduledDate: rs.scheduledDate,
    topic: rs.topic,
    instructorId: r.instructorId,
    instructorName: instructorName(w, r.instructorId) ?? "미배정",
    status: r.status,
    attendanceStatus: att?.status,
    participationScore: r.participationScore,
    homeworkDone: r.homeworkDone,
    feedback: r.feedback,
    highlights: r.highlights,
    improvements: r.improvements,
    submittedAt: r.submittedAt,
    reviewedAt: r.reviewedAt,
    publishedAt: r.publishedAt,
    returnNote: r.returnNote,
  };
}

export function instructorSessionDto(w: DemoWorld, rs: DemoRunSession): InstructorSessionDto {
  const run = runById(w, rs.programRunId);
  const tpl = templateOf(w, run);
  const counts = sessionCounts(w, rs);
  return {
    id: rs.id,
    programRunId: run.id,
    contractCode: run.contractCode,
    programTitle: run.title,
    campusName: campusName(w, run.campusId),
    sessionNumber: rs.sessionNumber,
    totalSessions: tpl.sessions.length,
    scheduledDate: rs.scheduledDate,
    startTime: rs.startTime,
    endTime: rs.endTime,
    sectionId: rs.sectionId,
    sectionLabel: sectionLabel(run, rs.sectionId),
    topic: rs.topic,
    location: rs.location,
    status: rs.status,
    ...counts,
  };
}

/** 같은 주(월~일)인지 */
export function sameWeek(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  const monday = (d: Date) => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x.toISOString().slice(0, 10);
  };
  return monday(da) === monday(db);
}

export function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
