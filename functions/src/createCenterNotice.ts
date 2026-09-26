import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';

function getDb() {
  return admin.firestore();
}

export interface CreateCenterNoticeRequest {
  programRunId: string;
  title: string;
  body?: string;
}

export interface CreateCenterNoticeResponse {
  notificationId: string;
}

export const createCenterNotice = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<CreateCenterNoticeRequest>): Promise<CreateCenterNoticeResponse> => {
    const programRunId = req.data?.programRunId?.trim();
    const title = req.data?.title?.trim();
    const body = req.data?.body?.trim();

    if (!programRunId || !title) {
      throw new HttpsError('invalid-argument', 'programRunId와 title이 필요합니다.');
    }
    if (title.length > 200) {
      throw new HttpsError('invalid-argument', '제목은 200자 이하입니다.');
    }

    const runSnap = await getDb().collection('programRuns').doc(programRunId).get();
    if (!runSnap.exists) {
      throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
    }
    const campusId = runSnap.data()!.campusId as string;
    assertCenterStaffForCampus(req, campusId);

    const ref = getDb().collection('notifications').doc();
    await ref.set({
      type: 'notice',
      title,
      body: body ?? '',
      programRunId,
      campusId,
      channel: '앱 알림',
      createdByUid: req.auth!.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { notificationId: ref.id };
  },
);
