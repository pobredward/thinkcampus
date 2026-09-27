/**
 * 회차 하나의 출결 시트 — web/src/services/types.ts 의 AttendanceSheet
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { assertCanWorkSession } from './auth/staffClaims';
import { getDb } from './lib/centerRunHelpers';
import { loadRunContext, loadStaff, loadStudents, sessionCounts, tsToIso } from './lib/runContext';

export const getProgramRunAttendanceSheet = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ runSessionId: string }>) => {
    const runSessionId = req.data?.runSessionId?.trim();
    if (!runSessionId) throw new HttpsError('invalid-argument', 'runSessionId가 필요합니다.');
    const sessSnap = await getDb().collection('runSessions').doc(runSessionId).get();
    if (!sessSnap.exists) throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
    const programRunId = sessSnap.data()!.programRunId as string;
    const ctx = await loadRunContext(programRunId);
    const rs = ctx.sessions.find((s) => s.id === runSessionId)!;
    assertCanWorkSession(req, ctx.run.campusId as string, rs.instructorId);

    const enrolled = ctx.activeEnrollments(rs.sectionId);
    const students = await loadStudents(enrolled.map((e) => e.studentId));
    const recorderIds = new Set<string>();
    for (const e of enrolled) {
      const att = ctx.attendance.get(`${rs.id}__${e.studentId}`);
      if (att?.recordedByUid) recorderIds.add(att.recordedByUid as string);
    }
    const staff = await loadStaff([...recorderIds, rs.instructorId ?? '']);

    const rows = enrolled
      .map((e) => {
        const st = students.get(e.studentId);
        const key = `${rs.id}__${e.studentId}`;
        const att = ctx.attendance.get(key);
        const rep = ctx.reports.get(key);
        return {
          studentId: e.studentId,
          name: e.studentName || (st?.name as string) || e.studentId,
          photoUrl: st?.photoUrl as string | undefined,
          status: att?.status as 'present' | 'late' | 'absent' | undefined,
          lateMinutes: typeof att?.lateMinutes === 'number' ? (att.lateMinutes as number) : undefined,
          participationScore: typeof rep?.participationScore === 'number' ? (rep.participationScore as number) : typeof att?.participationScore === 'number' ? (att.participationScore as number) : undefined,
          recordedByName: att?.recordedByUid ? staff.get(att.recordedByUid as string)?.displayName ?? '센터' : undefined,
          updatedAt: tsToIso(att?.updatedAt),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    const siblings = ctx.sessions
      .filter((s) => s.scheduledDate === rs.scheduledDate && s.id !== rs.id)
      .map((s) => {
        const c = sessionCounts(ctx, s);
        return { id: s.id, sectionLabel: ctx.sectionLabel(s.sectionId), startTime: s.startTime, recordedCount: c.recordedCount, enrolledCount: c.enrolledCount };
      });

    return {
      programRunId,
      contractCode: ctx.run.contractCode as string,
      session: {
        id: rs.id,
        sessionNumber: rs.sessionNumber,
        topic: rs.topic,
        scheduledDate: rs.scheduledDate,
        startTime: rs.startTime,
        endTime: rs.endTime,
        sectionId: rs.sectionId,
        sectionLabel: ctx.sectionLabel(rs.sectionId),
        location: rs.location,
        instructorId: rs.instructorId,
        instructorName: rs.instructorId ? staff.get(rs.instructorId)?.displayName : undefined,
        status: rs.status,
      },
      siblings,
      students: rows,
    };
  },
);
