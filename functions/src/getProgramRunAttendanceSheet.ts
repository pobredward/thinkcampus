import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';

function getDb() {
  return admin.firestore();
}

interface GetProgramRunAttendanceSheetRequest {
  programRunId: string;
  runSessionId?: string;
}

export interface AttendanceSheetStudent {
  studentId: string;
  name: string;
  status?: 'present' | 'late' | 'absent';
  lateMinutes?: number;
  participationScore?: number;
}

export interface AttendanceSheetSession {
  id: string;
  sessionNumber: number;
  topic: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
}

export interface GetProgramRunAttendanceSheetResponse {
  programRunId: string;
  contractCode: string;
  campusId: string;
  sessions: AttendanceSheetSession[];
  students: AttendanceSheetStudent[];
}

export const getProgramRunAttendanceSheet = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (
    req: CallableRequest<GetProgramRunAttendanceSheetRequest>,
  ): Promise<GetProgramRunAttendanceSheetResponse> => {
    const programRunId = req.data?.programRunId?.trim();
    const runSessionId = req.data?.runSessionId?.trim();
    if (!programRunId) {
      throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    }

    const runSnap = await getDb().collection('programRuns').doc(programRunId).get();
    if (!runSnap.exists) {
      throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
    }
    const run = runSnap.data()!;
    const campusId = run.campusId as string;
    assertCenterStaffForCampus(req, campusId);

    const sessSnap = await getDb()
      .collection('runSessions')
      .where('programRunId', '==', programRunId)
      .orderBy('sessionNumber', 'asc')
      .get();

    const sessions: AttendanceSheetSession[] = sessSnap.docs.map((d) => {
      const s = d.data();
      return {
        id: d.id,
        sessionNumber: s.sessionNumber as number,
        topic: (s.topic as string) ?? `회차 ${s.sessionNumber}`,
        scheduledDate: s.scheduledDate as string,
        startTime: s.startTime as string,
        endTime: s.endTime as string,
      };
    });

    const enrSnap = await getDb()
      .collection('studentProgramEnrollments')
      .where('programRunId', '==', programRunId)
      .get();

    const enrRows = enrSnap.docs
      .map((d) => {
        const data = d.data();
        return {
          studentId: data.studentId as string,
          denormName: data.studentName as string | undefined,
        };
      })
      .sort((a, b) => a.studentId.localeCompare(b.studentId));

    const resolved: AttendanceSheetStudent[] = [];
    for (const row of enrRows) {
      let name = row.denormName?.trim();
      if (!name) {
        const stSnap = await getDb().collection('students').doc(row.studentId).get();
        name = stSnap.exists ? ((stSnap.data()?.name as string) ?? row.studentId) : row.studentId;
      }
      resolved.push({ studentId: row.studentId, name });
    }

    if (runSessionId && resolved.length > 0) {
      const attSnap = await getDb()
        .collection('sessionAttendance')
        .where('runSessionId', '==', runSessionId)
        .get();
      const byStudent = new Map<string, admin.firestore.DocumentData>();
      for (const doc of attSnap.docs) {
        byStudent.set(doc.data().studentId as string, doc.data());
      }
      for (const st of resolved) {
        const att = byStudent.get(st.studentId);
        if (att) {
          st.status = att.status as AttendanceSheetStudent['status'];
          if (typeof att.lateMinutes === 'number') st.lateMinutes = att.lateMinutes;
          if (typeof att.participationScore === 'number') {
            st.participationScore = att.participationScore;
          }
        }
      }
    }

    return {
      programRunId,
      contractCode: run.contractCode as string,
      campusId,
      sessions,
      students: resolved,
    };
  },
);
