/**
 * 전화번호 / 등록코드 / 생년월일 포맷 유틸 — 모바일 앱과 동일한 규칙
 */

/** 010-1234-5678 / 01012345678 → +821012345678 */
export function toE164Korea(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("82")) return "+" + digits;
  if (digits.startsWith("0")) return "+82" + digits.slice(1);
  return "+82" + digits;
}

/** 01012345678 → 010-1234-5678 (입력 중 부분 포맷 포함) */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 01012345678 → 010-****-5678 */
export function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length >= 9) return d.slice(0, 3) + "-****-" + d.slice(-4);
  return formatPhone(d);
}

/** +821012345678 → 010-1234-5678 (프로필 표시용) */
export function e164ToLocal(e164: string | null | undefined): string {
  if (!e164) return "번호 없음";
  return e164.replace("+82", "0").replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
}

/** 등록코드: 영숫자 9자리 → DS26-A3F7K */
export function formatCode(raw: string): string {
  const clean = raw.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 9);
  if (clean.length <= 4) return clean;
  return clean.slice(0, 4) + "-" + clean.slice(4);
}

/** 생년월일 8자리 → 2010.03.15 (입력 중 부분 포맷 포함) */
export function formatBirth(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
  return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
}
