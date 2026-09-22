/**
 * 온보딩 단계 간 임시 데이터 — customToken 은 URL 에 노출하지 않고 sessionStorage 에 보관
 * (탭을 닫으면 사라짐)
 */

const KEY = "tc.onboarding";

export interface OnboardingSession {
  phone: string;
  customToken?: string;
  relation?: string;
  /** 보호자 이름 — OTP 로그인 직후 계정 표시 이름으로 저장 */
  guardianName?: string;
}

export function saveOnboardingSession(data: OnboardingSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode 등 */
  }
}

export function readOnboardingSession(): OnboardingSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingSession) : null;
  } catch {
    return null;
  }
}

export function clearOnboardingSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
