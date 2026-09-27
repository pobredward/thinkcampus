/**
 * 센터 · 운영 건 목록 / 요약(KPI) / 시간표 — web/src/services/types.ts 의
 * ProgramRunSummaryDto · CenterRunSummary · CenterScheduleDay 와 같은 응답
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { assertCenterOrCompanyForCampus, assertStaff, canSeeCampus } from './auth/staffClaims';
import { getDb, todayKstDate } from './lib/centerRunHelpers';
import {
  loadCampuses,
  loadRunContext,
  loadStaff,
  loadStudents,
  requireCompanyApproval,
  runSummaryDto,
  sessionCounts,
  type RunContext,
} from './lib/runContext';

const STATUS_ORDER: Record<string, number> = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 };

/** 내 캠퍼스의 운영 건 (회사 관리자는 전체) */
export const listCenterRuns = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    const claims = assertStaff(req);
    const campuses = await loadCampuses();
    let query = getDb().collection('programRuns') as FirebaseFirestore.Query;
    if (!claims.companyAdmin) {
      if (claims.campusIds.length === 0) return { runs: [] };
      query = query.where('campusId', 'in', claims.campusIds.slice(0, 30));
    }
    const snap = await query.get();
    const runs = await Promise.all(
      snap.docs.map(async (d) => {
        const ctx = await loadRunContext(d.id, { attendance: false, reports: false });
        const totalSessions = new Set(ctx.sessions.map((s) => s.sessionNumber)).size;
        return runSummaryDto(ctx, campuses, totalSessions);
      }),
    );
    runs.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || b.startDate.localeCompare(a.startDate));
    return { runs };
  },
);

export async function buildDashboard(ctx: RunContext) {
  const today = todayKstDate();
  const sessions = ctx.sessions.filter((s) => s.status !== 'cancelled');
  const todays = sessions.filter((s) => s.scheduledDate === today);
  const future = sessions.filter((s) => s.scheduledDate > today).map((s) => s.scheduledDate).sort();
  const enrolled = ctx.activeEnrollments();
  const students = await loadStudents(enrolled.map((e) => e.studentId));
  const withoutGuardian = enrolled.filter((e) => ((students.get(e.studentId)?.guardianUids as string[] | undefined) ?? []).length === 0).length;
  const approval = requireCompanyApproval(ctx.run);
  let pendingReview = 0;
  for (const r of ctx.reports.values()) {
    if (r.status === 'submitted' || (approval && r.status === 'reviewed')) pendingReview += 1;
  }
  let attendancePendingToday = 0;
  for (const s of todays) {
    const c = sessionCounts(ctx, s);
    attendancePendingToday += Math.max(0, c.enrolledCount - c.recordedCount);
  }
  return {
    totalStudents: enrolled.length,
    sectionsActive: ctx.sections.length,
    sessionsToday: todays.length,
    parallelSlotsToday: new Set(todays.map((s) => `${s.startTime}-${s.endTime}`)).size,
    attendancePendingToday,
    reportsPendingReview: pendingReview,
    studentsWithoutGuardian: withoutGuardian,
    sessionsWithoutInstructor: sessions.filter((s) => !s.instructorId && s.scheduledDate >= today).length,
    nextSessionDate: future[0] ?? null,
  };
}

export const getCenterRunSummary = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ programRunId: string }>) => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    const ctx = await loadRunContext(programRunId);
    assertCenterOrCompanyForCampus(req, ctx.run.campusId as string);
    const active = ctx.activeEnrollments();
    const sectionCounts = new Map<string, number>();
    for (const e of active) sectionCounts.set(e.sectionId, (sectionCounts.get(e.sectionId) ?? 0) + 1);
    return {
      programRunId,
      contractCode: ctx.run.contractCode as string,
      campusId: ctx.run.campusId as string,
      sections: ctx.sections.map((s) => ({ ...s, studentCount: sectionCounts.get(s.id) ?? 0 })),
      scheduleDates: [...new Set(ctx.sessions.map((s) => s.scheduledDate))].sort(),
      dashboard: await buildDashboard(ctx),
    };
  },
);

export const listCenterSchedule = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ programRunId: string }>) => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    const ctx = await loadRunContext(programRunId);
    const claims = assertStaff(req);
    if (!canSeeCampus(claims, ctx.run.campusId as string)) throw new HttpsError('permission-denied', '이 캠퍼스에 대한 권한이 없습니다.');
    const staff = await loadStaff(ctx.sessions.map((s) => s.instructorId ?? ''));
    const sectionOrder = new Map(ctx.sections.map((s) => [s.id, s.sortOrder]));

    const byDate = new Map<string, typeof ctx.sessions>();
    for (const s of ctx.sessions) byDate.set(s.scheduledDate, [...(byDate.get(s.scheduledDate) ?? []), s]);
    const days = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, list]) => {
        const bySlot = new Map<string, typeof list>();
        for (const s of list) {
          const key = `${s.startTime}-${s.endTime}`;
          bySlot.set(key, [...(bySlot.get(key) ?? []), s]);
        }
        return {
          date,
          sessionNumber: list[0]?.sessionNumber ?? 0,
          slots: [...bySlot.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, arr]) => ({
              startTime: arr[0].startTime,
              endTime: arr[0].endTime,
              sessions: arr
                .sort((a, b) => (sectionOrder.get(a.sectionId) ?? 99) - (sectionOrder.get(b.sectionId) ?? 99))
                .map((s) => ({
                  id: s.id,
                  sessionNumber: s.sessionNumber,
                  topic: s.topic,
                  sectionId: s.sectionId,
                  sectionLabel: ctx.sectionLabel(s.sectionId),
                  startTime: s.startTime,
                  endTime: s.endTime,
                  location: s.location,
                  instructorId: s.instructorId,
                  instructorName: s.instructorId ? staff.get(s.instructorId)?.displayName : undefined,
                  status: s.status,
                  cancelReason: s.cancelReason,
                  ...sessionCounts(ctx, s),
                })),
            })),
        };
      });
    return { days };
  },
);
