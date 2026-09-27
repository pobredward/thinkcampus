import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { readStaffClaims } from './auth/staffClaims';
import { getDb } from './lib/centerRunHelpers';

/** web/src/services/types.ts 의 StaffAccess 와 같다 */
export interface CheckStaffAccessResponse {
  allowed: boolean;
  companyAdmin: boolean;
  centerAdmin: boolean;
  instructor: boolean;
  campusIds: string[];
  displayName?: string;
  email?: string;
  phone?: string;
}

/** 직원 웹(회사 · 센터 · 강사) — Custom Claims + staff 프로필 */
export const checkStaffAccess = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<Record<string, never>>): Promise<CheckStaffAccessResponse> => {
    if (!req.auth?.uid) {
      return { allowed: false, companyAdmin: false, centerAdmin: false, instructor: false, campusIds: [] };
    }
    const c = readStaffClaims(req);
    const allowed = c.companyAdmin || c.centerAdmin || c.instructor;
    const res: CheckStaffAccessResponse = {
      allowed,
      companyAdmin: c.companyAdmin,
      centerAdmin: c.centerAdmin,
      instructor: c.instructor,
      campusIds: c.campusIds,
    };
    if (allowed) {
      const snap = await getDb().collection('staff').doc(c.uid).get();
      const d = snap.exists ? snap.data()! : undefined;
      res.displayName = (d?.displayName as string) || (d?.name as string) || (req.auth.token.name as string | undefined) || undefined;
      res.email = (d?.email as string) || (req.auth.token.email as string | undefined) || undefined;
      res.phone = d?.phone as string | undefined;
    }
    return res;
  },
);
