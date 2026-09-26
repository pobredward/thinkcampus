import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { assertCompanyAdmin } from './auth/assertCompanyAdmin';

export interface CheckCompanyAdminAccessResponse {
  allowed: boolean;
}

/** Admin 웹 라우트 가드 — ROSTER_IMPORT_UIDS 포함 */
export const checkCompanyAdminAccess = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>): Promise<CheckCompanyAdminAccessResponse> => {
    try {
      assertCompanyAdmin(req);
      return { allowed: true };
    } catch {
      return { allowed: false };
    }
  },
);
