import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';
import { getDb, sessionTopic, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';

interface GetProgramRunAttendanceSheetRequest {
  programRunId: string;
  runSessionId?: string;
}

export interface AttendanceSheetStudent {
  studentId: string;
  name: string;
  photoUrl?: string;
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
  sectionId?: string;
  sectionLabel?: string;
}

export interface GetProgramRunAttendanceSheetResponse {
  programRunId: string;
  contractCode: string;
  campusId: string;
  sessions: AttendanceSheetSession[];
  students: AttendanceSheetStudent[];
}

function sectionLabelFromRun(run: admin.firestore.DocumentData, sectionId: string): string {
  if (sectionId === UNASSIGNED_SECTION_ID) return '미배정';
  if (!Array.isArray(run.sections)) return sectionId;
  for (const item of run.sections) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (String(row.id) === sectionId) return String(row.label ?? sectionId);
  }
  return sectionId;
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
      const sectionId = (s.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      return {
        id: d.id,
        sessionNumber: s.sessionNumber as number,
        topic: sessionTopic(s),
        scheduledDate: s.scheduledDate as string,
        startTime: (s.startTime as string) || (run.startTime as string) || '',
        endTime: (s.endTime as string) || (run.endTime as string) || '',
        sectionId,
        sectionLabel: sectionLabelFromRun(run, sectionId),
      };
    });

    let targetSectionId: string | null = null;
    if (runSessionId) {
      const active = sessSnap.docs.find((d) => d.id === runSessionId);
      if (active) {
        targetSectionId = (active.data().sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      }
    }

    const enrSnap = await getDb()
      .collection('studentProgramEnrollments')
      .where('programRunId', '==', programRunId)
      .get();

    const enrRows = enrSnap.docs
      .map((d) => {
        const data = d.data();
        const sectionId = (data.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
        return {
          studentId: data.studentId as string,
          denormName: data.studentName as string | undefined,
          sectionId,
        };
      })
      .filter((row) => !targetSectionId || row.sectionId === targetSectionId)
      .sort((a, b) => a.studentId.localeCompare(b.studentId));

    const studentRefs = enrRows.map((row) => getDb().collection('students').doc(row.studentId));
    const studentSnaps = studentRefs.length > 0 ? await getDb().getAll(...studentRefs) : [];
    const studentById = new Map(studentSnaps.map((s) => [s.id, s]));

    const resolved: AttendanceSheetStudent[] = [];
    for (const row of enrRows) {
      let name = row.denormName?.trim();
      const stSnap = studentById.get(row.studentId);
      if (stSnap?.exists) {
        if (!name) name = (stSnap.data()?.name as string) ?? row.studentId;
      } else if (!name) {
        name = row.studentId;
      }
      const photoUrl = stSnap?.exists ? (stSnap.data()?.photoUrl as string | undefined) : undefined;
      resolved.push({ studentId: row.studentId, name, photoUrl });
    }
    resolved.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

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
