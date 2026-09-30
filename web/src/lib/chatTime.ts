/**
 * 채팅 시간 표시 — 학부모 · 직원 채팅 화면 공통 (브라우저 로컬 시간 = 한국)
 *   말풍선 옆      "오후 2:05"
 *   날짜 구분선    "9월 30일 (수)"
 *   방 목록        오늘 "오후 2:05" · 어제 "어제" · 그 전 "9.28"
 *   기다린 시간    "12분" · "3시간 10분" · "2일"
 */

import { WEEKDAYS, dateToKey } from "./dates";

function parse(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function chatClock(iso: string): string {
  const d = parse(iso);
  if (!d) return "";
  const h = d.getHours();
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function chatDayKey(iso: string): string {
  const d = parse(iso);
  return d ? dateToKey(d) : "";
}

export function chatDayLabel(iso: string): string {
  const d = parse(iso);
  if (!d) return "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function chatListTime(iso: string, now = new Date()): string {
  const d = parse(iso);
  if (!d) return "";
  const today = dateToKey(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const key = dateToKey(d);
  if (key === today) return chatClock(iso);
  if (key === dateToKey(y)) return "어제";
  if (d.getFullYear() !== now.getFullYear()) return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

export function waitedFor(iso: string, now = Date.now()): string {
  const d = parse(iso);
  if (!d) return "";
  const min = Math.max(0, Math.floor((now - d.getTime()) / 60_000));
  if (min < 1) return "방금";
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `${h}시간 ${min % 60}분` : `${h}시간`;
  return `${Math.floor(h / 24)}일`;
}

/** "9.30 오후 2:05" — 민원 · 처리 이력 */
export function chatStamp(iso: string): string {
  const d = parse(iso);
  if (!d) return "";
  return `${d.getMonth() + 1}.${d.getDate()} ${chatClock(iso)}`;
}
