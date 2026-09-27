/**
 * 출결 저장 — 센터·강사 공통. 한 번에 여러 명(records) 또는 한 명(옛 형식) 모두 받는다.
 *   sessionAttendance/{runSessionId__studentId} 저장
 *   sessionReports 문서가 없으면 draft 로 하나 만든다 (강사가 이어서 작성)
 *   처음 입력할 때 보호자 알림(notifications) 한 건
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { assertCanWorkSession } from './auth/staffClaims';
import { getDb } from './lib/centerRunHelpers';
import { loadRun } from './lib/runContext';

export type SessionAttendanceStatus = 'present' | 'late' | 'absent';

export interface RecordAttendanceInput {
  runSessionId: string;
  studentId: string;
  status: SessionAttendanceStatus;
  lateMinutes?: number;
  participationScore?: number;
}

export interface RecordSessionAttendanceRequest extends Partial<RecordAttendanceInput> {
  records?: RecordAttendanceInput[];
}

const ATTENDANCE_LABEL: Record<SessionAttendanceStatus, string> = { present: '출석했어요', late: '늦게 도착했어요', absent: '결석했어요' };

export const recordSessionAttendance = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<RecordSessionAttendanceRequest>): Promise<{ saved: number; attendanceId?: string }> => {
    const data = req.data ?? {};
    const records: RecordAttendanceInput[] = Array.isArray(data.records)
      ? data.records
      : data.runSessionId && data.studentId && data.status
        ? [{ runSessionId: data.runSessionId, studentId: data.studentId, status: data.status, lateMinutes: data.lateMinutes, participationScore: data.participationScore }]
        : [];
    if (records.length === 0) throw new HttpsError('invalid-argument', 'records 가 필요합니다.');
    if (records.length > 200) throw new HttpsError('invalid-argument', '한 번에 200명까지 저장할 수 있습니다.');
    for (const r of records) {
      if (!r.runSessionId || !r.studentId || !['present', 'late', 'absent'].includes(r.status)) {
        throw new HttpsError('invalid-argument', 'runSessionId, studentId, status(present|late|absent)가 필요합니다.');
      }
    }

    const db = getDb();
    const sessionIds = [...new Set(records.map((r) => r.runSessionId))];
    const sessSnaps = await db.getAll(...sessionIds.map((id) => db.collection('runSessions').doc(id)));
    const sessions = new Map<string, FirebaseFirestore.DocumentData>();
    for (const s of sessSnaps) {
      if (!s.exists) throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
      sessions.set(s.id, s.data()!);
    }
    const runIds = [...new Set([...sessions.values()].map((s) => s.programRunId as string))];
    const runs = new Map<string, FirebaseFirestore.DocumentData>();
    for (const id of runIds) runs.set(id, await loadRun(id));
    for (const [, s] of sessions) {
      const run = runs.get(s.programRunId as string)!;
      assertCanWorkSession(req, run.campusId as string, (s.instructorId as string | undefined) || null);
    }

    const uid = req.auth!.uid;
    const batch = db.batch();
    let lastId: string | undefined;
    for (const r of records) {
      const sess = sessions.get(r.runSessionId)!;
      const programRunId = sess.programRunId as string;
      const run = runs.get(programRunId)!;
      const enr = await db
        .collection('studentProgramEnrollments')
        .where('studentId', '==', r.studentId)
        .where('programRunId', '==', programRunId)
        .limit(1)
        .get();
      if (enr.empty) throw new HttpsError('failed-precondition', `수강 등록이 없는 학생입니다: ${r.studentId}`);

      const attendanceId = `${r.runSessionId}__${r.studentId}`;
      lastId = attendanceId;
      const ref = db.collection('sessionAttendance').doc(attendanceId);
      const existing = await ref.get();
      const payload: Record<string, unknown> = {
        runSessionId: r.runSessionId,
        programRunId,
        studentId: r.studentId,
        campusId: run.campusId,
        sessionNumber: sess.sessionNumber,
        status: r.status,
        lateMinutes: r.status === 'late' ? Math.max(1, Math.round(r.lateMinutes ?? 5)) : FieldValue.delete(),
        recordedByUid: uid,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (r.status !== 'absent' && !existing.exists) payload.checkinAt = FieldValue.serverTimestamp();
      if (typeof r.participationScore === 'number') payload.participationScore = Math.min(100, Math.max(0, r.participationScore));
      if (!existing.exists) payload.createdAt = FieldValue.serverTimestamp();
      batch.set(ref, payload, { merge: true });

      const repRef = db.collection('sessionReports').doc(attendanceId);
      const rep = await repRef.get();
      if (!rep.exists) {
        batch.set(repRef, {
          runSessionId: r.runSessionId,
          programRunId,
          campusId: run.campusId,
          studentId: r.studentId,
          instructorId: (sess.instructorId as string | undefined) || null,
          status: 'draft',
          participationScore: typeof r.participationScore === 'number' ? r.participationScore : null,
          homeworkDone: null,
          feedback: '',
          highlights: [],
          improvements: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      if (!existing.exists) {
        const student = await db.collection('students').doc(r.studentId).get();
        const name = (student.data()?.name as string) ?? '학생';
        const date = String(sess.scheduledDate ?? '');
        batch.set(db.collection('notifications').doc(`att-${attendanceId}`), {
          type: 'attendance',
          title: `${name} 출결 확인`,
          body: `${Number(date.slice(5, 7))}월 ${Number(date.slice(8, 10))}일 ${sess.startTime ?? ''} 수업에 ${r.status === 'late' ? `${payload.lateMinutes}분 ` : ''}${ATTENDANCE_LABEL[r.status]}.`,
          programRunId,
          campusId: run.campusId,
          studentId: r.studentId,
          channel: '앱 알림',
          createdByUid: uid,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
    await batch.commit();
    return { saved: records.length, attendanceId: lastId };
  },
);
