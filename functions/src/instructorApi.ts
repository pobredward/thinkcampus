/**
 * 강사 앱 — 오늘 / 내 수업 / 회차 작업 화면 (web/src/services/types.ts InstructorHome · InstructorSessionDto · InstructorSessionWorkspace)
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { assertStaff, assertCanWorkSession } from './auth/staffClaims';
import { getDb, todayKstDate } from './lib/centerRunHelpers';
import { campusNameOf, loadCampuses, loadRunContext, loadStudents, runTitle, sessionCounts, type RunContext, type RunSessionRow } from './lib/runContext';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function sessionDto(ctx: RunContext, rs: RunSessionRow, campuses: Map<string, FirebaseFirestore.DocumentData>) {
  return {
    id: rs.id,
    programRunId: ctx.runId,
    contractCode: (ctx.run.contractCode as string) ?? '',
    programTitle: runTitle(ctx.run),
    campusName: campusNameOf(campuses, ctx.run.campusId as string),
    sessionNumber: rs.sessionNumber,
    totalSessions: new Set(ctx.sessions.map((s) => s.sessionNumber)).size,
    scheduledDate: rs.scheduledDate,
    startTime: rs.startTime,
    endTime: rs.endTime,
    sectionId: rs.sectionId,
    sectionLabel: ctx.sectionLabel(rs.sectionId),
    topic: rs.topic,
    location: rs.location,
    status: rs.status,
    ...sessionCounts(ctx, rs),
  };
}

/** 내 담당 회차 전체 (운영 건별 컨텍스트 포함) */
async function loadMySessions(uid: string) {
  const snap = await getDb().collection('runSessions').where('instructorId', '==', uid).get();
  const runIds = [...new Set(snap.docs.map((d) => d.data().programRunId as string))];
  const contexts = new Map<string, RunContext>();
  for (const id of runIds) contexts.set(id, await loadRunContext(id));
  const campuses = await loadCampuses();
  const list: Array<{ ctx: RunContext; rs: RunSessionRow }> = [];
  for (const [, ctx] of contexts) for (const rs of ctx.sessions) if (rs.instructorId === uid && rs.status !== 'cancelled') list.push({ ctx, rs });
  list.sort((a, b) => a.rs.scheduledDate.localeCompare(b.rs.scheduledDate) || a.rs.startTime.localeCompare(b.rs.startTime) || a.rs.sectionId.localeCompare(b.rs.sectionId));
  return { list, contexts, campuses };
}

export const getInstructorHome = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    const claims = assertStaff(req);
    const today = todayKstDate();
    const { list, contexts, campuses } = await loadMySessions(claims.uid);
    const staffSnap = await getDb().collection('staff').doc(claims.uid).get();
    const displayName = (staffSnap.data()?.displayName as string) || (req.auth?.token.name as string) || '강사';
    return {
      displayName,
      today,
      todaySessions: list.filter((x) => x.rs.scheduledDate === today).map((x) => sessionDto(x.ctx, x.rs, campuses)),
      upcoming: list.filter((x) => x.rs.scheduledDate > today).slice(0, 6).map((x) => sessionDto(x.ctx, x.rs, campuses)),
      runs: [...contexts.values()].map((ctx) => {
        const mine = list.filter((x) => x.ctx.runId === ctx.runId);
        const times = [...new Set(mine.map((x) => `${x.rs.startTime}–${x.rs.endTime}`))].sort();
        return {
          programRunId: ctx.runId,
          contractCode: (ctx.run.contractCode as string) ?? '',
          title: runTitle(ctx.run),
          campusName: campusNameOf(campuses, ctx.run.campusId as string),
          scheduleLine: `${ctx.run.frequency === 'biweekly' ? '격주' : '매주'} ${WEEKDAYS[(ctx.run.fixedDay as number) ?? 6]}요일 · ${times.join(' · ')}`,
          mySessions: mine.length,
        };
      }),
    };
  },
);

export const listInstructorSessions = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    const claims = assertStaff(req);
    const { list, campuses } = await loadMySessions(claims.uid);
    return { sessions: list.map((x) => sessionDto(x.ctx, x.rs, campuses)) };
  },
);

export const getInstructorSessionWorkspace = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ runSessionId: string }>) => {
    const runSessionId = req.data?.runSessionId?.trim();
    if (!runSessionId) throw new HttpsError('invalid-argument', 'runSessionId가 필요합니다.');
    const sessSnap = await getDb().collection('runSessions').doc(runSessionId).get();
    if (!sessSnap.exists) throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
    const ctx = await loadRunContext(sessSnap.data()!.programRunId as string);
    const rs = ctx.sessions.find((s) => s.id === runSessionId)!;
    assertCanWorkSession(req, ctx.run.campusId as string, rs.instructorId);
    const campuses = await loadCampuses();

    // 수업 내용: sessionTemplates 문서 + 회차 overrides
    const tplSnap = rs.sessionTemplateId ? await getDb().collection('sessionTemplates').doc(rs.sessionTemplateId).get() : null;
    const tpl = tplSnap?.exists ? tplSnap.data()! : {};
    const ov = (rs.raw.overrides as Record<string, unknown> | undefined) ?? {};
    const lessonPlans = (Array.isArray(tpl.lessonPlans) ? (tpl.lessonPlans as Array<Record<string, unknown>>) : []).map((lp, i) => ({
      lessonCode: `${(tpl.programCode as string) ?? rs.sessionTemplateId}-L${(lp.lessonNumber as number) ?? i + 1}`,
      title: (lp.topic as string) ?? '',
      planUrl: (ov.planUrl as string) ?? (tpl.planUrl as string) ?? undefined,
      slideViewUrl: (lp.slideUrl as string) ?? (ov.canvaSlideUrl as string) ?? undefined,
      activityUrl: (lp.activityUrl as string) ?? (ov.canvaActivityUrl as string) ?? undefined,
    }));

    const enrolled = ctx.activeEnrollments(rs.sectionId);
    const students = await loadStudents(enrolled.map((e) => e.studentId));
    const roster = enrolled
      .map((e) => {
        const key = `${rs.id}__${e.studentId}`;
        const att = ctx.attendance.get(key);
        const r = ctx.reports.get(key);
        return {
          studentId: e.studentId,
          name: e.studentName || (students.get(e.studentId)?.name as string) || e.studentId,
          photoUrl: students.get(e.studentId)?.photoUrl as string | undefined,
          attendance: att?.status as 'present' | 'late' | 'absent' | undefined,
          lateMinutes: typeof att?.lateMinutes === 'number' ? (att.lateMinutes as number) : undefined,
          report: {
            status: ((r?.status as string) ?? 'draft') as 'draft' | 'submitted' | 'reviewed' | 'published',
            participationScore: typeof r?.participationScore === 'number' ? (r.participationScore as number) : null,
            homeworkDone: typeof r?.homeworkDone === 'boolean' ? (r.homeworkDone as boolean) : null,
            feedback: (r?.feedback as string) ?? '',
            highlights: (r?.highlights as string[]) ?? [],
            improvements: (r?.improvements as string[]) ?? [],
            returnNote: r?.returnNote as string | undefined,
          },
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    const same = ctx.sessions.filter((s) => s.sectionId === rs.sectionId).sort((a, b) => a.sessionNumber - b.sessionNumber);
    const idx = same.findIndex((s) => s.id === rs.id);
    return {
      session: sessionDto(ctx, rs, campuses),
      plan: {
        description: (ov.description as string) ?? (tpl.description as string) ?? '',
        objectives: (tpl.defaultObjectives as string[]) ?? (tpl.objectives as string[]) ?? [],
        teachingMethod: tpl.teachingMethod as string | undefined,
        curriculum: (tpl.defaultCurriculum as string[]) ?? (tpl.curriculum as string[]) ?? [],
        materials: (tpl.defaultMaterials as string[]) ?? (tpl.materials as string[]) ?? [],
        rotationNote: tpl.rotationNote as string | undefined,
      },
      lessonMaterials: lessonPlans,
      roster,
      prevSessionId: idx > 0 ? same[idx - 1].id : null,
      nextSessionId: idx >= 0 && idx < same.length - 1 ? same[idx + 1].id : null,
    };
  },
);
