import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { assertCompanyAdmin } from './auth/assertCompanyAdmin';

export interface CheckStaffAccessResponse {
  allowed: boolean;
  companyAdmin: boolean;
  centerAdmin: boolean;
  campusIds: string[];
}

function readCenterCampusIds(req: CallableRequest<unknown>): string[] {
  const role = req.auth?.token.role as string | undefined;
  if (role !== 'centerAdmin') return [];
  const raw = req.auth?.token.campusIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** Admin·센터 웹 — companyAdmin / centerAdmin / ROSTER_IMPORT_UIDS */
export const checkStaffAccess = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>): Promise<CheckStaffAccessResponse> => {
    if (!req.auth?.uid) {
      return { allowed: false, companyAdmin: false, centerAdmin: false, campusIds: [] };
    }
    let companyAdmin = false;
    try {
      assertCompanyAdmin(req);
      companyAdmin = true;
    } catch {
      companyAdmin = false;
    }
    const campusIds = readCenterCampusIds(req);
    const centerAdmin = campusIds.length > 0;
    return {
      allowed: companyAdmin || centerAdmin,
      companyAdmin,
      centerAdmin,
      campusIds,
    };
  },
);
