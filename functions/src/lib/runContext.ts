/**
 * 운영 건 한 개를 화면용으로 조립할 때 필요한 문서를 한 번에 읽는다
 *   programRuns · studentProgramEnrollments · runSessions · sessionAttendance · sessionReports · students · staff
 * 센터·강사·회사 Callable 이 같이 쓴다 (web/src/services/types.ts 의 DTO 와 필드를 맞춘다)
 */

import * as admin from 'firebase-admin';
// admin.firestore.Timestamp 네임스페이스 접근은 Functions 에뮬레이터에서 undefined 가 되는 경우가 있어 모듈형 import
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { getDb, sessionTopic, UNASSIGNED_SECTION_ID } from './centerRunHelpers';

export type DocumentData = admin.firestore.DocumentData;

export interface SectionDef {
  id: string;
  label: string;
  sortOrder: number;
}

export interface RunSessionRow {
  id: string;
  programRunId: string;
  sessionNumber: number;
  sessionTemplateId: string;
  sectionId: string;
  instructorId: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  topic: string;
  location: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  cancelReason?: string;
  raw: DocumentData;
}

export interface EnrollmentRow {
  id: string;
  studentId: string;
  sectionId: string;
  status: string;
  studentName?: string;
}

export interface RunContext {
  runId: string;
  run: DocumentData;
  sections: SectionDef[];
  sessions: RunSessionRow[];
  enrollments: EnrollmentRow[];
  /** `${runSessionId}__${studentId}` → 문서 */
  attendance: Map<string, DocumentData>;
  reports: Map<string, DocumentData>;
  sectionLabel(id: string): string;
  activeEnrollments(sectionId?: string): EnrollmentRow[];
}

export function normalizeSections(run: DocumentData): SectionDef[] {
  const raw = run.sections;
  if (!Array.isArray(raw)) return [];
  const out: SectionDef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    const label = String(row.label ?? '').trim();
    if (!id || !label) continue;
    out.push({ id, label, sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : out.length });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function toRunSessionRow(id: string, s: DocumentData, run: DocumentData): RunSessionRow {
  const status = (s.status as string) === 'cancelled' ? 'cancelled' : (s.status as string) === 'completed' ? 'completed' : 'scheduled';
  return {
    id,
    programRunId: s.programRunId as string,
    sessionNumber: (s.sessionNumber as number) ?? 0,
    sessionTemplateId: (s.sessionTemplateId as string) ?? '',
    sectionId: (s.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID,
    instructorId: (s.instructorId as string | undefined)?.trim() || null,
    scheduledDate: (s.scheduledDate as string) ?? '',
    startTime: (s.startTime as string) || (run.startTime as string) || '',
    endTime: (s.endTime as string) || (run.endTime as string) || '',
    lessonCount: (s.lessonCount as number) ?? 3,
    topic: sessionTopic(s),
    location: (s.location as string) || (run.location as string) || '',
    status,
    ...(s.cancelReason ? { cancelReason: s.cancelReason as string } : {}),
    raw: s,
  };
}

export async function loadRun(runId: string): Promise<DocumentData> {
  const snap = await getDb().collection('programRuns').doc(runId).get();
  if (!snap.exists) throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
  return snap.data()!;
}

export async function loadRunContext(
  runId: string,
  opts: { attendance?: boolean; reports?: boolean } = {},
): Promise<RunContext> {
  const run = await loadRun(runId);
  const db = getDb();
  const [enrSnap, sessSnap, attSnap, repSnap] = await Promise.all([
    db.collection('studentProgramEnrollments').where('programRunId', '==', runId).get(),
    db.collection('runSessions').where('programRunId', '==', runId).get(),
    opts.attendance === false ? null : db.collection('sessionAttendance').where('programRunId', '==', runId).get(),
    opts.reports === false ? null : db.collection('sessionReports').where('programRunId', '==', runId).get(),
  ]);

  const sections = normalizeSections(run);
  const sessions = sessSnap.docs
    .map((d) => toRunSessionRow(d.id, d.data(), run))
    .sort((a, b) => a.sessionNumber - b.sessionNumber || a.startTime.localeCompare(b.startTime) || a.sectionId.localeCompare(b.sectionId));
  const enrollments: EnrollmentRow[] = enrSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      studentId: data.studentId as string,
      sectionId: (data.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID,
      status: (data.status as string) ?? 'active',
      studentName: (data.studentName as string | undefined)?.trim() || undefined,
    };
  });
  // 반이 정의돼 있지 않은 운영 건(시드 등)은 수강생 전체가 한 반
  const knownSectionIds = new Set(sections.map((s) => s.id));
  for (const e of enrollments) {
    if (e.sectionId !== UNASSIGNED_SECTION_ID && !knownSectionIds.has(e.sectionId)) {
      sections.push({ id: e.sectionId, label: e.sectionId, sortOrder: sections.length });
      knownSectionIds.add(e.sectionId);
    }
  }
  if (sections.length === 0) sections.push({ id: UNASSIGNED_SECTION_ID, label: '전체', sortOrder: 0 });

  const attendance = new Map<string, DocumentData>();
  for (const d of attSnap?.docs ?? []) attendance.set(d.id, d.data());
  const reports = new Map<string, DocumentData>();
  for (const d of repSnap?.docs ?? []) reports.set(d.id, d.data());

  const labelMap = new Map(sections.map((s) => [s.id, s.label]));
  return {
    runId,
    run,
    sections,
    sessions,
    enrollments,
    attendance,
    reports,
    sectionLabel: (id) => labelMap.get(id) ?? (id === UNASSIGNED_SECTION_ID ? '전체' : id),
    activeEnrollments: (sectionId) =>
      enrollments.filter((e) => e.status !== 'withdrawn' && (!sectionId || sectionId === UNASSIGNED_SECTION_ID || e.sectionId === sectionId || e.sectionId === UNASSIGNED_SECTION_ID)),
  };
}

/** 회차의 수강 인원 · 출결 입력 · 리포트 제출(검수 대기 이상) */
export function sessionCounts(ctx: RunContext, rs: RunSessionRow): { enrolledCount: number; recordedCount: number; reportedCount: number } {
  const enrolled = ctx.activeEnrollments(rs.sectionId);
  let recordedCount = 0;
  let reportedCount = 0;
  for (const e of enrolled) {
    const key = `${rs.id}__${e.studentId}`;
    if (ctx.attendance.has(key)) recordedCount += 1;
    const r = ctx.reports.get(key);
    if (r && r.status !== 'draft') reportedCount += 1;
  }
  return { enrolledCount: enrolled.length, recordedCount, reportedCount };
}

export async function loadStudents(studentIds: string[]): Promise<Map<string, DocumentData>> {
  const out = new Map<string, DocumentData>();
  const ids = [...new Set(studentIds)];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const snaps = await getDb().getAll(...chunk.map((id) => getDb().collection('students').doc(id)));
    for (const s of snaps) if (s.exists) out.set(s.id, s.data()!);
  }
  return out;
}

export interface StaffProfile {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  role?: string;
  campusIds: string[];
  title?: string;
  bio?: string;
  specialties: string[];
  photoUrl?: string;
}

export function toStaffProfile(uid: string, d: DocumentData | undefined): StaffProfile {
  return {
    uid,
    displayName: (d?.displayName as string) || (d?.name as string) || uid,
    email: d?.email as string | undefined,
    phone: d?.phone as string | undefined,
    role: d?.role as string | undefined,
    campusIds: Array.isArray(d?.campusIds) ? (d!.campusIds as string[]) : [],
    title: d?.title as string | undefined,
    bio: d?.bio as string | undefined,
    specialties: Array.isArray(d?.specialties) ? (d!.specialties as string[]) : [],
    photoUrl: d?.photoUrl as string | undefined,
  };
}

export async function loadStaff(uids: string[]): Promise<Map<string, StaffProfile>> {
  const out = new Map<string, StaffProfile>();
  const ids = [...new Set(uids.filter(Boolean))];
  if (ids.length === 0) return out;
  const snaps = await getDb().getAll(...ids.map((id) => getDb().collection('staff').doc(id)));
  for (const s of snaps) out.set(s.id, toStaffProfile(s.id, s.exists ? s.data() : undefined));
  return out;
}

export function campusNameOf(campuses: Map<string, DocumentData>, campusId: string): string {
  return (campuses.get(campusId)?.name as string) ?? campusId;
}

export async function loadCampuses(): Promise<Map<string, DocumentData>> {
  const snap = await getDb().collection('campuses').get();
  return new Map(snap.docs.map((d) => [d.id, d.data()]));
}

export function runSummaryDto(ctx: RunContext, campuses: Map<string, DocumentData>, totalSessions: number) {
  const run = ctx.run;
  const active = ctx.activeEnrollments();
  const sectionCounts = new Map<string, number>();
  for (const e of active) sectionCounts.set(e.sectionId, (sectionCounts.get(e.sectionId) ?? 0) + 1);
  return {
    id: ctx.runId,
    contractCode: (run.contractCode as string) ?? '',
    title: runTitle(run),
    campusId: run.campusId as string,
    campusName: campusNameOf(campuses, run.campusId as string),
    municipalityName: (run.municipalityName as string) ?? '',
    status: ((run.status as string) ?? 'draft') as 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled',
    startDate: (run.startDate as string) ?? '',
    endDate: (run.endDate as string | null) ?? null,
    frequency: ((run.frequency as string) === 'weekly' ? 'weekly' : 'biweekly') as 'weekly' | 'biweekly',
    fixedDay: (run.fixedDay as number) ?? 6,
    startTime: (run.startTime as string) ?? '',
    endTime: (run.endTime as string) ?? '',
    location: (run.location as string) ?? '',
    totalSessions,
    studentCount: active.length,
    sections: ctx.sections.map((s) => ({ ...s, studentCount: sectionCounts.get(s.id) ?? 0 })),
    reportPolicy: { requireCompanyApproval: Boolean((run.reportPolicy as { requireCompanyApproval?: boolean } | undefined)?.requireCompanyApproval) },
  };
}

export function runTitle(run: DocumentData): string {
  const t = (run.title as string | undefined)?.trim();
  if (t) return t;
  return `${(run.municipalityName as string) ?? ''} ${(run.contractCode as string) ?? ''}`.trim();
}

export function requireCompanyApproval(run: DocumentData): boolean {
  return Boolean((run.reportPolicy as { requireCompanyApproval?: boolean } | undefined)?.requireCompanyApproval);
}

export function tsToIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (typeof v === 'string') return v;
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}
