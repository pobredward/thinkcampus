/**
 * @deprecated getCenterRunSummary + list* API 사용.
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { buildCenterRunSummary, type GetCenterRunSummaryResponse } from './getCenterRunSummary';

export interface GetCenterRunOpsRequest {
  programRunId: string;
}

export type GetCenterRunOpsResponse = GetCenterRunSummaryResponse & {
  lessons: [];
  students: [];
  guardians: [];
  instructors: [];
  reports: [];
  notifications: [];
};

export const getCenterRunOps = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<GetCenterRunOpsRequest>): Promise<GetCenterRunOpsResponse> => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) {
      throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    }
    const summary = await buildCenterRunSummary(req, programRunId);
    return {
      ...summary,
      lessons: [],
      students: [],
      guardians: [],
      instructors: [],
      reports: [],
      notifications: [],
    };
  },
);
