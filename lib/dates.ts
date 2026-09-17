/**
 * 날짜 유틸 — 더미 데이터의 'YYYY.MM.DD (요일)' 형식과 'YYYY-MM-DD' 키 변환
 * 모든 계산은 브라우저 로컬 시간(한국) 기준.
 */

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** '2026.09.06 (토)' → '2026-09-06' */
export function dotDateToKey(s: string): string {
  const m = s.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${pad(Number(m[2]))}-${pad(Number(m[3]))}`;
}

/** 'YYYY-MM-DD' → 로컬 자정 Date */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayKey(): string {
  return dateToKey(new Date());
}

/** to - from (일) */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToDate(toKey).getTime() - keyToDate(fromKey).getTime()) / 86_400_000);
}

/** '2026-11-15' → '11월 15일 (토)' */
export function formatKoreanDate(key: string): string {
  const d = keyToDate(key);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

/** '2026-11-15' → '11.15 (토)' */
export function formatShortDate(key: string): string {
  const d = keyToDate(key);
  return `${d.getMonth() + 1}.${d.getDate()} (${WEEKDAYS[d.getDay()]})`;
}

/** D-day 라벨: 0 → 'D-DAY', 3 → 'D-3', -2 → '' */
export function dDayLabel(days: number): string {
  if (days === 0) return "D-DAY";
  if (days > 0) return `D-${days}`;
  return "";
}
