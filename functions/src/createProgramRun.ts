import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import { assertCompanyAdmin } from './auth/assertCompanyAdmin';
import { generateRunSessionDrafts, type SessionPlanItem } from './lib/generateRunSessions';

function getDb() {
  return admin.firestore();
}

export interface CreateProgramRunRequest {
  contractCode: string;
  programTemplateId: string;
  campusId: string;
  municipalityName: string;
  startDate: string;
  endDate?: string;
  frequency: 'weekly' | 'biweekly';
  fixedDay: number;
  startTime: string;
  endTime: string;
  location: string;
  sessionPlan: SessionPlanItem[];
  defaultLessonCount: number;
  excludedDates?: string[];
  fillSessionCount?: boolean;
  reportPolicy?: { requireCompanyApproval: boolean };
  logoUrl?: string;
  host?: string;
}

export interface CreateProgramRunResponse {
  programRunId: string;
  contractCode: string;
  runSessionCount: number;
}

export const createProgramRun = onCall(
  { region: 'asia-northeast3', maxInstances: 5 },
  async (req: CallableRequest<CreateProgramRunRequest>): Promise<CreateProgramRunResponse> => {
    assertCompanyAdmin(req);
    const data = req.data;
    const contractCode = data?.contractCode?.trim();
    if (!contractCode) throw new HttpsError('invalid-argument', 'contractCode 필요');
    if (!data.sessionPlan?.length) {
      throw new HttpsError('invalid-argument', 'sessionPlan(회차 배치)이 필요합니다.');
    }

    const dup = await getDb()
      .collection('programRuns')
      .where('contractCode', '==', contractCode)
      .limit(1)
      .get();
    if (!dup.empty) {
      throw new HttpsError('already-exists', `contractCode 중복: ${contractCode}`);
    }

    const campusSnap = await getDb().collection('campuses').doc(data.campusId).get();
    if (!campusSnap.exists) {
      throw new HttpsError('not-found', `캠퍼스 없음: ${data.campusId}`);
    }

    const runRef = getDb().collection('programRuns').doc();
    const drafts = generateRunSessionDrafts({
      programRunId: runRef.id,
      startDate: data.startDate,
      endDate: data.endDate,
      frequency: data.frequency,
      fixedDay: data.fixedDay as 0 | 1 | 2 | 3 | 4 | 5 | 6,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      sessionPlan: data.sessionPlan,
      defaultLessonCount: data.defaultLessonCount,
      excludedDates: data.excludedDates,
      fillSessionCount: data.fillSessionCount ?? true,
    });

    const batch = getDb().batch();
    batch.set(runRef, {
      contractCode,
      programTemplateId: data.programTemplateId,
      campusId: data.campusId,
      municipalityName: data.municipalityName,
      status: 'scheduled',
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      frequency: data.frequency,
      fixedDay: data.fixedDay,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      sessionPlan: data.sessionPlan,
      logoUrl: data.logoUrl ?? null,
      host: data.host ?? null,
      reportPolicy: data.reportPolicy ?? { requireCompanyApproval: false },
      createdAt: FieldValue.serverTimestamp(),
      createdByUid: req.auth!.uid,
    });

    for (const d of drafts) {
      const plan = data.sessionPlan[d.sessionNumber - 1];
      const topic = plan?.topic?.trim() || plan?.sessionTemplateId || `회차 ${d.sessionNumber}`;
      const sessRef = getDb().collection('runSessions').doc();
      batch.set(sessRef, {
        programRunId: runRef.id,
        sessionNumber: d.sessionNumber,
        sessionTemplateId: d.sessionTemplateId,
        topic,
        scheduledDate: d.scheduledDate,
        startTime: d.startTime,
        endTime: d.endTime,
        lessonCount: d.lessonCount,
        location: d.location,
        status: 'scheduled',
        source: 'generated',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return {
      programRunId: runRef.id,
      contractCode,
      runSessionCount: drafts.length,
    };
  },
);
