/**
 * 센터 · 강사 목록 / 강사 상세(회차 배정 옵션) / 회차 배정
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { assertCenterOrCompanyForCampus } from './auth/staffClaims';
import { getDb, todayKstDate } from './lib/centerRunHelpers';
import { loadRunContext, loadStaff, toStaffProfile, type RunSessionRow, type StaffProfile } from './lib/runContext';

function sameWeek(a: string, b: string): boolean {
  const monday = (key: string) => {
    const d = new Date(`${key}T00:00:00+09:00`);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    return d.toISOString().slice(0, 10);
  };
  return monday(a) === monday(b);
}

async function instructorSessions(uid: string): Promise<RunSessionRow[]> {
  const snap = await getDb().collection('runSessions').where('instructorId', '==', uid).get();
  return snap.docs
    .map((d) => {
      const s = d.data();
      return {
        id: d.id,
        programRunId: s.programRunId as string,
        sessionNumber: (s.sessionNumber as number) ?? 0,
        sessionTemplateId: (s.sessionTemplateId as string) ?? '',
        sectionId: (s.sectionId as string) ?? '_unassigned',
        instructorId: uid,
        scheduledDate: (s.scheduledDate as string) ?? '',
        startTime: (s.startTime as string) ?? '',
        endTime: (s.endTime as string) ?? '',
        lessonCount: (s.lessonCount as number) ?? 3,
        topic: (s.topic as string) ?? '',
        location: (s.location as string) ?? '',
        status: ((s.status as string) === 'cancelled' ? 'cancelled' : 'scheduled') as RunSessionRow['status'],
        raw: s,
      };
    })
    .filter((s) => s.status !== 'cancelled');
}

function instructorDto(p: StaffProfile, mine: RunSessionRow[], programRunId: string) {
  const today = todayKstDate();
  return {
    staffId: p.uid,
    name: p.displayName,
    email: p.email,
    phone: p.phone,
    photoUrl: p.photoUrl,
    bio: p.bio,
    specialties: p.specialties,
    campusIds: p.campusIds,
    sessionsThisWeek: mine.filter((s) => sameWeek(s.scheduledDate, today)).length,
    sessionsInRun: mine.filter((s) => s.programRunId === programRunId).length,
  };
}

export const listCenterInstructors = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ programRunId: string }>) => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    const ctx = await loadRunContext(programRunId, { attendance: false, reports: false });
    const campusId = ctx.run.campusId as string;
    assertCenterOrCompanyForCampus(req, campusId);
    const snap = await getDb().collection('staff').where('role', '==', 'instructor').where('campusIds', 'array-contains', campusId).get();
    const list = await Promise.all(
      snap.docs.map(async (d) => instructorDto(toStaffProfile(d.id, d.data()), await instructorSessions(d.id), programRunId)),
    );
    list.sort((a, b) => b.sessionsInRun - a.sessionsInRun || a.name.localeCompare(b.name, 'ko'));
    return { instructors: list };
  },
);

export const getCenterInstructor = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ staffId: string; programRunId: string }>) => {
    const programRunId = req.data?.programRunId?.trim();
    const staffId = req.data?.staffId?.trim();
    if (!programRunId || !staffId) throw new HttpsError('invalid-argument', 'staffId, programRunId가 필요합니다.');
    const ctx = await loadRunContext(programRunId, { attendance: false, reports: false });
    assertCenterOrCompanyForCampus(req, ctx.run.campusId as string);
    const staffSnap = await getDb().collection('staff').doc(staffId).get();
    if (!staffSnap.exists) throw new HttpsError('not-found', '강사를 찾을 수 없습니다.');
    const profile = toStaffProfile(staffId, staffSnap.data());
    const mine = await instructorSessions(staffId);
    const names = await loadStaff(ctx.sessions.map((s) => s.instructorId ?? ''));
    const sessions = ctx.sessions.map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      scheduledDate: s.scheduledDate,
      startTime: s.startTime,
      endTime: s.endTime,
      sectionId: s.sectionId,
      sectionLabel: ctx.sectionLabel(s.sectionId),
      topic: s.topic,
      instructorId: s.instructorId,
      instructorName: s.instructorId ? names.get(s.instructorId)?.displayName : undefined,
      conflict: s.instructorId !== staffId && mine.some((m) => m.id !== s.id && m.scheduledDate === s.scheduledDate && m.startTime < s.endTime && s.startTime < m.endTime),
    }));
    return { profile: instructorDto(profile, mine, programRunId), sessions };
  },
);

export const assignInstructorToSession = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ runSessionId: string; staffId: string | null }>) => {
    const runSessionId = req.data?.runSessionId?.trim();
    if (!runSessionId) throw new HttpsError('invalid-argument', 'runSessionId가 필요합니다.');
    const staffId = req.data?.staffId?.trim() || null;
    const db = getDb();
    const sessSnap = await db.collection('runSessions').doc(runSessionId).get();
    if (!sessSnap.exists) throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
    const sess = sessSnap.data()!;
    const ctx = await loadRunContext(sess.programRunId as string, { attendance: false, reports: false });
    assertCenterOrCompanyForCampus(req, ctx.run.campusId as string);
    const rs = ctx.sessions.find((s) => s.id === runSessionId)!;

    if (staffId) {
      const staffSnap = await db.collection('staff').doc(staffId).get();
      if (!staffSnap.exists || staffSnap.data()!.role !== 'instructor') throw new HttpsError('not-found', '강사를 찾을 수 없습니다.');
      const mine = await instructorSessions(staffId);
      const clash = mine.find((m) => m.id !== rs.id && m.scheduledDate === rs.scheduledDate && m.startTime < rs.endTime && rs.startTime < m.endTime);
      if (clash) {
        throw new HttpsError('failed-precondition', `${staffSnap.data()!.displayName ?? '이 강사'} 강사는 같은 시간에 다른 수업이 있어요.`);
      }
    }
    const batch = db.batch();
    batch.update(sessSnap.ref, { instructorId: staffId, updatedAt: FieldValue.serverTimestamp() });
    // 작성 중 리포트는 새 강사 몫
    const drafts = await db.collection('sessionReports').where('runSessionId', '==', runSessionId).where('status', '==', 'draft').get();
    for (const d of drafts.docs) batch.update(d.ref, { instructorId: staffId });
    await batch.commit();
    return { ok: true };
  },
);
