import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { assertCompanyAdmin } from './assertCompanyAdmin';

/**
 * 센터 출결·일정 등 campus 스코프 작업
 * - companyAdmin: 전체
 * - centerAdmin: token.campusIds 에 포함된 캠퍼스만
 */
export function assertCenterStaffForCampus(req: CallableRequest<unknown>, campusId: string): string {
  if (!req.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const role = req.auth.token.role as string | undefined;
  if (role === 'companyAdmin') {
    return req.auth.uid;
  }
  if (role === 'centerAdmin') {
    const campusIds = req.auth.token.campusIds as string[] | undefined;
    if (Array.isArray(campusIds) && campusIds.includes(campusId)) {
      return req.auth.uid;
    }
    throw new HttpsError('permission-denied', '이 캠퍼스에 대한 권한이 없습니다.');
  }
  try {
    return assertCompanyAdmin(req);
  } catch {
    throw new HttpsError(
      'permission-denied',
      '센터 권한이 없습니다. (companyAdmin / centerAdmin)',
    );
  }
}
