/**
 * Firebase 에러 → 사용자 메시지 (웹 web/src/lib/errors.ts 와 같은 규칙)
 *
 * @react-native-firebase 에러는 message 앞에 "[functions/not-found] " 처럼 코드가 붙는다.
 *   - 사용자에게 보일 때는 떼어낸다.
 *   - 네트워크 끊김·서버 미응답은 "서버에 연결할 수 없습니다" 로 바꾼다.
 */

export interface FirebaseLikeError {
  code?: string;
  message?: string;
}

const CODE_PREFIX = /^\s*\[[\w-]+\/[\w-]+\]\s*/;

export function errCode(e: unknown): string {
  return (e as FirebaseLikeError)?.code ?? '';
}

function rawMessage(e: unknown): string {
  return (e as FirebaseLikeError)?.message ?? '';
}

/** 서버에 요청이 닿지 않은 경우 (오프라인, 서버 미응답 등) */
export function isNetworkError(e: unknown): boolean {
  const code = errCode(e);
  return code === 'auth/network-request-failed' || code === 'functions/unavailable';
}

export function networkErrorMessage(): string {
  return '서버에 연결할 수 없습니다.\n인터넷 연결을 확인한 뒤 다시 시도해주세요.';
}

export function errMessage(e: unknown, fallback = '오류가 발생했습니다.'): string {
  if (isNetworkError(e)) return networkErrorMessage();
  const cleaned = rawMessage(e).replace(CODE_PREFIX, '').trim();
  if (!cleaned) return fallback;
  // "internal", "INTERNAL", "not-found" 같은 SDK 기본 영문 코드는 사용자에게 의미가 없음
  if (/^[a-z_-]+$/i.test(cleaned)) return fallback;
  return cleaned;
}

/** OTP 확인 단계 공통 메시지 */
export function otpErrorMessage(e: unknown): string {
  const code = errCode(e);
  if (code === 'auth/invalid-verification-code') return '인증번호가 올바르지 않습니다.';
  if (code === 'auth/code-expired' || code === 'auth/session-expired')
    return '인증번호가 만료되었습니다. 재발송해주세요.';
  return errMessage(e);
}

/** SMS 발송 단계 공통 메시지 */
export function smsErrorMessage(e: unknown): string {
  const code = errCode(e);
  if (isNetworkError(e)) return networkErrorMessage();
  if (code === 'auth/invalid-phone-number') return '올바르지 않은 전화번호입니다.';
  if (code === 'auth/too-many-requests') return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
  return errMessage(e, '잠시 후 다시 시도해주세요.');
}
