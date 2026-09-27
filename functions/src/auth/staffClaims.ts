import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { assertCompanyAdmin } from './assertCompanyAdmin';

/**
 * 직원 권한 — Custom Claims
 *   companyAdmin: 전체
 *   centerAdmin:  token.campusIds 캠퍼스
 *   instructor:   token.campusIds 캠퍼스 + 자기 회차
 * (ROSTER_IMPORT_UIDS 는 회사 관리자로 본다)
 */
export interface StaffClaims {
  uid: string;
  companyAdmin: boolean;
  centerAdmin: boolean;
  instructor: boolean;
  campusIds: string[];
}

export function readStaffClaims(req: CallableRequest<unknown>): StaffClaims {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const role = req.auth.token.role as string | undefined;
  const raw = req.auth.token.campusIds;
  const campusIds = Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
  let companyAdmin = role === 'companyAdmin';
  if (!companyAdmin) {
    try {
      assertCompanyAdmin(req);
      companyAdmin = true;
    } catch {
      companyAdmin = false;
    }
  }
  return {
    uid: req.auth.uid,
    companyAdmin,
    centerAdmin: role === 'centerAdmin' && campusIds.length > 0,
    instructor: role === 'instructor',
    campusIds,
  };
}

export function assertStaff(req: CallableRequest<unknown>): StaffClaims {
  const c = readStaffClaims(req);
  if (!c.companyAdmin && !c.centerAdmin && !c.instructor) {
    throw new HttpsError('permission-denied', '직원 권한이 없습니다.');
  }
  return c;
}

/** 센터·회사 — 이 캠퍼스를 관리할 수 있는지 (강사는 아님) */
export function assertCenterOrCompanyForCampus(req: CallableRequest<unknown>, campusId: string): StaffClaims {
  const c = readStaffClaims(req);
  if (c.companyAdmin) return c;
  if (c.centerAdmin && c.campusIds.includes(campusId)) return c;
  throw new HttpsError('permission-denied', '이 캠퍼스에 대한 권한이 없습니다.');
}

/** 강사 본인 회차 · 또는 그 캠퍼스의 센터/회사 */
export function assertCanWorkSession(req: CallableRequest<unknown>, campusId: string, instructorId: string | null): StaffClaims {
  const c = readStaffClaims(req);
  if (c.companyAdmin) return c;
  if (c.centerAdmin && c.campusIds.includes(campusId)) return c;
  if (c.instructor && instructorId === c.uid) return c;
  throw new HttpsError('permission-denied', '이 회차에 대한 권한이 없습니다.');
}

export function canSeeCampus(c: StaffClaims, campusId: string): boolean {
  return c.companyAdmin || c.campusIds.includes(campusId);
}
