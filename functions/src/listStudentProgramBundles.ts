import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertGuardianOfStudent } from './lib/assertGuardianOfStudent';

function getDb() {
  return admin.firestore();
}

export interface ProgramBundleRunSession {
  id: string;
  programRunId: string;
  sessionNumber: number;
  sessionTemplateId: string;
  topic: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  location: string;
  status: string;
  cancelReason?: string;
  overrides?: { description?: string };
}

export interface ProgramBundleRun {
  contractCode: string;
  programTemplateId: string;
  campusId: string;
  municipalityName: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  frequency: 'weekly' | 'biweekly';
  fixedDay: number;
  startTime: string;
  endTime: string;
  location: string;
  mapQuery?: string;
  host?: string;
  logoUrl?: string;
}

export interface StudentProgramBundleDto {
  enrollmentId: string;
  programRunId: string;
  status: string;
  run: ProgramBundleRun;
  sessions: ProgramBundleRunSession[];
}

interface ListStudentProgramBundlesRequest {
  studentId: string;
  programRunId?: string;
}

export interface ListStudentProgramBundlesResponse {
  bundles: StudentProgramBundleDto[];
}

export const listStudentProgramBundles = onCall(
  { region: 'asia-northeast3', maxInstances: 15 },
  async (
    req: CallableRequest<ListStudentProgramBundlesRequest>,
  ): Promise<ListStudentProgramBundlesResponse> => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');

    const studentId = req.data?.studentId?.trim();
    const filterRunId = req.data?.programRunId?.trim();
    if (!studentId) throw new HttpsError('invalid-argument', 'studentId가 필요합니다.');

    await assertGuardianOfStudent(uid, studentId);

    let enrQuery = getDb()
      .collection('studentProgramEnrollments')
      .where('studentId', '==', studentId);
    if (filterRunId) {
      enrQuery = enrQuery.where('programRunId', '==', filterRunId);
    }
    const enrSnap = await enrQuery.get();
    if (enrSnap.empty) return { bundles: [] };

    const runIds = [...new Set(enrSnap.docs.map((d) => d.data().programRunId as string))];
    const runSnaps = await getDb().getAll(...runIds.map((id) => getDb().collection('programRuns').doc(id)));
    const runById = new Map<string, admin.firestore.DocumentData>();
    for (const snap of runSnaps) {
      if (snap.exists) runById.set(snap.id, snap.data()!);
    }

    const sessionsByRun = new Map<string, ProgramBundleRunSession[]>();
    await Promise.all(
      runIds.map(async (runId) => {
        const sessSnap = await getDb()
          .collection('runSessions')
          .where('programRunId', '==', runId)
          .orderBy('sessionNumber', 'asc')
          .get();
        const list: ProgramBundleRunSession[] = sessSnap.docs.map((d) => {
          const s = d.data();
          return {
            id: d.id,
            programRunId: runId,
            sessionNumber: s.sessionNumber as number,
            sessionTemplateId: (s.sessionTemplateId as string) ?? '',
            topic: (s.topic as string) ?? '',
            scheduledDate: s.scheduledDate as string,
            startTime: s.startTime as string,
            endTime: s.endTime as string,
            lessonCount: s.lessonCount as number,
            location: s.location as string,
            status: (s.status as string) ?? 'scheduled',
            ...(s.cancelReason ? { cancelReason: s.cancelReason as string } : {}),
            ...(s.overrides ? { overrides: s.overrides as { description?: string } } : {}),
          };
        });
        sessionsByRun.set(runId, list);
      }),
    );

    const bundles: StudentProgramBundleDto[] = [];
    for (const enr of enrSnap.docs) {
      const data = enr.data();
      const programRunId = data.programRunId as string;
      const runData = runById.get(programRunId);
      if (!runData) continue;

      const run: ProgramBundleRun = {
        contractCode: runData.contractCode as string,
        programTemplateId: runData.programTemplateId as string,
        campusId: runData.campusId as string,
        municipalityName: (runData.municipalityName as string) ?? '',
        status: (runData.status as string) ?? 'draft',
        startDate: runData.startDate as string,
        endDate: (runData.endDate as string | null) ?? null,
        frequency: runData.frequency as 'weekly' | 'biweekly',
        fixedDay: runData.fixedDay as number,
        startTime: runData.startTime as string,
        endTime: runData.endTime as string,
        location: runData.location as string,
        ...(runData.mapQuery ? { mapQuery: runData.mapQuery as string } : {}),
        ...(runData.host ? { host: runData.host as string } : {}),
        ...(runData.logoUrl ? { logoUrl: runData.logoUrl as string } : {}),
      };

      bundles.push({
        enrollmentId: enr.id,
        programRunId,
        status: (data.status as string) ?? 'active',
        run,
        sessions: sessionsByRun.get(programRunId) ?? [],
      });
    }

    bundles.sort((a, b) => {
      const ta = `${a.run.municipalityName} ${a.run.contractCode}`;
      const tb = `${b.run.municipalityName} ${b.run.contractCode}`;
      return ta.localeCompare(tb, 'ko');
    });

    return { bundles };
  },
);
