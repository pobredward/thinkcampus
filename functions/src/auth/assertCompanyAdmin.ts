import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';

/**
 * roster·운영 건 등 회사 admin 전용 Callable
 * Custom claim: role === 'companyAdmin'
 * 또는 Functions 환경변수 ROSTER_IMPORT_UIDS=uid1,uid2 (에뮬레이터·초기 운영)
 */
export function assertCompanyAdmin(req: CallableRequest<unknown>): string {
  if (!req.auth?.uid) {
    throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  }
  const role = req.auth.token.role;
  if (role === 'companyAdmin') {
    return req.auth.uid;
  }
  const allowList = (process.env.ROSTER_IMPORT_UIDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowList.includes(req.auth.uid)) {
    return req.auth.uid;
  }
  throw new HttpsError(
    'permission-denied',
    '명단 import 권한이 없습니다. (companyAdmin 또는 ROSTER_IMPORT_UIDS)',
  );
}
