import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';

function getDb() {
  return admin.firestore();
}

export type SessionAttendanceStatus = 'present' | 'late' | 'absent';

export interface RecordSessionAttendanceRequest {
  runSessionId: string;
  studentId: string;
  status: SessionAttendanceStatus;
  lateMinutes?: number;
  participationScore?: number;
  homeworkDone?: boolean | null;
  feedback?: string;
  highlights?: string[];
  improvements?: string[];
}

export interface RecordSessionAttendanceResponse {
  attendanceId: string;
}

export const recordSessionAttendance = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (
    req: CallableRequest<RecordSessionAttendanceRequest>,
  ): Promise<RecordSessionAttendanceResponse> => {
    const data = req.data ?? {};
    const { runSessionId, studentId, status } = data;
    if (!runSessionId || !studentId || !status) {
      throw new HttpsError('invalid-argument', 'runSessionId, studentId, status가 필요합니다.');
    }
    if (!['present', 'late', 'absent'].includes(status)) {
      throw new HttpsError('invalid-argument', 'status는 present | late | absent');
    }

    const sessSnap = await getDb().collection('runSessions').doc(runSessionId).get();
    if (!sessSnap.exists) {
      throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
    }
    const sess = sessSnap.data()!;
    const programRunId = sess.programRunId as string;

    const runSnap = await getDb().collection('programRuns').doc(programRunId).get();
    if (!runSnap.exists) {
      throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
    }
    const campusId = runSnap.data()!.campusId as string;
    assertCenterStaffForCampus(req, campusId);

    const enrSnap = await getDb()
      .collection('studentProgramEnrollments')
      .where('studentId', '==', studentId)
      .where('programRunId', '==', programRunId)
      .limit(1)
      .get();
    if (enrSnap.empty) {
      throw new HttpsError('failed-precondition', '해당 학생의 수강 등록이 없습니다.');
    }

    const attendanceId = `${runSessionId}__${studentId}`;
    const ref = getDb().collection('sessionAttendance').doc(attendanceId);
    const payload: Record<string, unknown> = {
      runSessionId,
      programRunId,
      studentId,
      campusId,
      sessionNumber: sess.sessionNumber,
      status,
      recordedByUid: req.auth!.uid,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (status === 'present' || status === 'late') {
      payload.checkinAt = FieldValue.serverTimestamp();
    }
    if (status === 'late' && typeof data.lateMinutes === 'number') {
      payload.lateMinutes = data.lateMinutes;
    }
    if (typeof data.participationScore === 'number') {
      payload.participationScore = Math.min(100, Math.max(0, data.participationScore));
    }
    if (data.homeworkDone !== undefined) {
      payload.homeworkDone = data.homeworkDone;
    }
    if (data.feedback?.trim()) {
      payload.feedback = data.feedback.trim();
    }
    if (data.highlights?.length) {
      payload.highlights = data.highlights;
    }
    if (data.improvements?.length) {
      payload.improvements = data.improvements;
    }

    const existing = await ref.get();
    if (!existing.exists) {
      payload.createdAt = FieldValue.serverTimestamp();
    }

    await ref.set(payload, { merge: true });
    return { attendanceId };
  },
);
