/**
 * Firebase 에러 → 사용자 메시지
 * 모바일 앱의 분기와 동일한 코드(functions/*, auth/*)를 사용한다.
 *
 * Firebase JS SDK(v12)의 Functions 에러 메시지에는 HTTP 상태가 " [401]" 처럼 붙는다.
 *   - 사용자에게 보일 때는 떼어낸다.
 *   - "[0]" 은 서버 응답이 아니라 요청 자체가 실패한 것(네트워크 끊김·서버 미실행) → 연결 안내로 바꾼다.
 */

export interface FirebaseLikeError {
  code?: string;
  message?: string;
}

const STATUS_SUFFIX = /\s*\[\d{1,3}\]\s*$/;
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === "1";

export function errCode(e: unknown): string {
  return (e as FirebaseLikeError)?.code ?? "";
}

function rawMessage(e: unknown): string {
  return (e as FirebaseLikeError)?.message ?? "";
}

/** 서버에 요청이 닿지 않은 경우 (오프라인, 방화벽, 에뮬레이터 미실행 등) */
export function isNetworkError(e: unknown): boolean {
  const code = errCode(e);
  if (code === "auth/network-request-failed") return true;
  return code.startsWith("functions/") && /\[0\]\s*$/.test(rawMessage(e));
}

export function networkErrorMessage(): string {
  const base = "서버에 연결할 수 없습니다.\n인터넷 연결을 확인한 뒤 다시 시도해주세요.";
  return USE_EMULATORS
    ? `${base}\n\n[개발] Firebase 에뮬레이터가 실행 중인지 확인하세요.\nfirebase emulators:start --only auth,firestore,functions --project demo-thinkcampus`
    : base;
}

export function errMessage(e: unknown, fallback = "오류가 발생했습니다."): string {
  if (isNetworkError(e)) return networkErrorMessage();
  const cleaned = rawMessage(e).replace(STATUS_SUFFIX, "").trim();
  if (!cleaned) return fallback;
  // "internal", "INTERNAL", "not-found" 같은 SDK 기본 영문 코드는 사용자에게 의미가 없음
  if (/^[a-z_-]+$/i.test(cleaned)) return fallback;
  return cleaned;
}

/** OTP 확인 단계 공통 메시지 */
export function otpErrorMessage(e: unknown): string {
  const code = errCode(e);
  if (code === "auth/invalid-verification-code") return "인증번호가 올바르지 않습니다.";
  if (code === "auth/code-expired") return "인증번호가 만료되었습니다. 재발송해주세요.";
  return errMessage(e);
}

/** SMS 발송 단계 공통 메시지 */
export function smsErrorMessage(e: unknown): string {
  const code = errCode(e);
  if (isNetworkError(e)) return networkErrorMessage();
  if (code === "auth/invalid-phone-number") return "올바르지 않은 전화번호입니다.";
  if (code === "auth/too-many-requests")
    return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
  if (code === "auth/captcha-check-failed")
    return "보안 확인에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.";
  return errMessage(e, "잠시 후 다시 시도해주세요.");
}
