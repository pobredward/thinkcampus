/**
 * 회사 앱 — 홈 / 운영 건 목록·상세 / 템플릿 / 캠퍼스 / 정책 / 직원
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { assertCompanyAdmin } from './auth/assertCompanyAdmin';
import { getDb } from './lib/centerRunHelpers';
import { loadCampuses, loadRunContext, loadStaff, loadStudents, runSummaryDto, toStaffProfile, tsToIso } from './lib/runContext';

const STATUS_ORDER: Record<string, number> = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 };

async function allRunSummaries() {
  const campuses = await loadCampuses();
  const snap = await getDb().collection('programRuns').get();
  const runs = await Promise.all(
    snap.docs.map(async (d) => {
      const ctx = await loadRunContext(d.id, { attendance: false, reports: false });
      return runSummaryDto(ctx, campuses, new Set(ctx.sessions.map((s) => s.sessionNumber)).size);
    }),
  );
  runs.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || b.startDate.localeCompare(a.startDate));
  return { runs, campuses };
}

async function campusDtos(campuses: Map<string, FirebaseFirestore.DocumentData>, runs: Awaited<ReturnType<typeof allRunSummaries>>['runs']) {
  return [...campuses.entries()].map(([id, c]) => {
    const mine = runs.filter((r) => r.campusId === id && (r.status === 'active' || r.status === 'scheduled'));
    return {
      id,
      name: (c.name as string) ?? id,
      municipalityName: (c.municipalityName as string) ?? (c.region as string) ?? '',
      address: c.address as string | undefined,
      runCount: mine.length,
      studentCount: mine.reduce((a, r) => a + r.studentCount, 0),
    };
  });
}

export const getCompanyHome = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    assertCompanyAdmin(req);
    const { runs, campuses } = await allRunSummaries();
    const open = runs.filter((r) => r.status === 'active' || r.status === 'scheduled');
    const reviewed = await getDb().collection('sessionReports').where('status', '==', 'reviewed').get();
    const imports = await getDb().collection('rosterImports').orderBy('createdAt', 'desc').limit(1).get();
    const last = imports.docs[0]?.data();
    return {
      runs,
      campuses: await campusDtos(campuses, runs),
      totalStudents: open.reduce((a, r) => a + r.studentCount, 0),
      lastImport: last ? { at: tsToIso(last.createdAt) ?? '', rowCount: (last.rowCount as number) ?? 0, contractCode: (last.contractCode as string) ?? '' } : null,
      reportsAwaitingApproval: reviewed.size,
      complaintsOpen: (await getDb().collection('inquiries').where('status', 'in', ['received', 'inProgress']).get()).docs.filter((d) => d.data().kind !== 'question').length,
    };
  },
);

export const listProgramRuns = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    assertCompanyAdmin(req);
    return { runs: (await allRunSummaries()).runs };
  },
);

export const getProgramRun = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ programRunId: string }>) => {
    assertCompanyAdmin(req);
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    const ctx = await loadRunContext(programRunId, { reports: false });
    const campuses = await loadCampuses();
    const staff = await loadStaff(ctx.sessions.map((s) => s.instructorId ?? ''));
    const tplSnap = await getDb().collection('programTemplates').doc(ctx.run.programTemplateId as string).get();
    const counts = new Map<string, number>();
    for (const s of ctx.sessions) if (s.instructorId) counts.set(s.instructorId, (counts.get(s.instructorId) ?? 0) + 1);
    const enrolled = ctx.activeEnrollments();
    const students = await loadStudents(enrolled.map((e) => e.studentId));
    const linked = enrolled.filter((e) => ((students.get(e.studentId)?.guardianUids as string[] | undefined) ?? []).length > 0).length;
    let att = 0;
    let present = 0;
    for (const a of ctx.attendance.values()) {
      att += 1;
      if (a.status !== 'absent') present += 1;
    }
    return {
      ...runSummaryDto(ctx, campuses, new Set(ctx.sessions.map((s) => s.sessionNumber)).size),
      host: ctx.run.host as string | undefined,
      mapQuery: ctx.run.mapQuery as string | undefined,
      programTemplateId: ctx.run.programTemplateId as string,
      programTemplateTitle: (tplSnap.data()?.title as string) ?? (ctx.run.programTemplateId as string),
      sessions: ctx.sessions.map((s) => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        scheduledDate: s.scheduledDate,
        startTime: s.startTime,
        endTime: s.endTime,
        sectionId: s.sectionId,
        sectionLabel: ctx.sectionLabel(s.sectionId),
        topic: s.topic,
        instructorName: s.instructorId ? staff.get(s.instructorId)?.displayName : undefined,
        status: s.status,
      })),
      instructors: [...counts.entries()].map(([staffId, sessionCount]) => ({ staffId, name: staff.get(staffId)?.displayName ?? staffId, sessionCount })),
      partnerNameMasking: !!ctx.run.partnerNameMasking,
      guardianLinkedCount: linked,
      attendanceRate: att > 0 ? Math.round((present / att) * 100) : null,
      createdAt: tsToIso(ctx.run.createdAt),
    };
  },
);

export const listProgramTemplates = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    assertCompanyAdmin(req);
    const db = getDb();
    const [tplSnap, sessSnap] = await Promise.all([db.collection('programTemplates').get(), db.collection('sessionTemplates').get()]);
    const sessionsByTpl = new Map<string, Array<{ id: string; order: number; topic: string; lessonCount: number }>>();
    for (const d of sessSnap.docs) {
      const s = d.data();
      const key = s.programTemplateId as string;
      sessionsByTpl.set(key, [
        ...(sessionsByTpl.get(key) ?? []),
        { id: d.id, order: (s.order as number) ?? 0, topic: (s.topic as string) ?? '', lessonCount: (s.defaultLessonCount as number) ?? (s.lessonCount as number) ?? 3 },
      ]);
    }
    const templates = tplSnap.docs.map((d) => {
      const t = d.data();
      const sessions = (sessionsByTpl.get(d.id) ?? []).sort((a, b) => a.order - b.order);
      return {
        id: d.id,
        title: (t.title as string) ?? d.id,
        subtitle: t.subtitle as string | undefined,
        category: t.category as string | undefined,
        defaultSessionCount: (t.defaultSessionCount as number) ?? sessions.length,
        defaultLessonCount: (t.defaultSessionHours as number) ?? 3,
        defaultFrequency: ((t.defaultFrequency as string) === 'weekly' ? 'weekly' : 'biweekly') as 'weekly' | 'biweekly',
        defaultFixedDay: (t.defaultFixedDay as number) ?? 6,
        defaultStartTime: (t.defaultStartTime as string) ?? '10:00',
        defaultEndTime: (t.defaultEndTime as string) ?? '12:00',
        sessions,
      };
    });
    return { templates };
  },
);

export const listCampuses = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    assertCompanyAdmin(req);
    const { runs, campuses } = await allRunSummaries();
    return { campuses: await campusDtos(campuses, runs) };
  },
);

export const updateProgramRunPolicy = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ programRunId: string; reportPolicy: { requireCompanyApproval: boolean } }>) => {
    assertCompanyAdmin(req);
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    await getDb()
      .collection('programRuns')
      .doc(programRunId)
      .update({ reportPolicy: { requireCompanyApproval: Boolean(req.data.reportPolicy?.requireCompanyApproval) }, updatedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  },
);

export const listStaff = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>) => {
    assertCompanyAdmin(req);
    const snap = await getDb().collection('staff').get();
    const staff = snap.docs.map((d) => {
      const p = toStaffProfile(d.id, d.data());
      return { uid: p.uid, displayName: p.displayName, email: p.email, phone: p.phone, role: (p.role ?? 'centerAdmin') as 'companyAdmin' | 'centerAdmin' | 'instructor', campusIds: p.campusIds };
    });
    staff.sort((a, b) => a.role.localeCompare(b.role) || a.displayName.localeCompare(b.displayName, 'ko'));
    return { staff };
  },
);
