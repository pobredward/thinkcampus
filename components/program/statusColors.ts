/**
 * 회차 상태 배지 색 (웹 programView.STATUS_BADGE 의 Tailwind 클래스와 같은 색 — 미드나잇)
 */

import type { DayStatus } from '../../data/programView';

export const STATUS_BADGE: Record<DayStatus, { bg: string; color: string }> = {
  present: { bg: '#2a2417', color: '#d4b06a' },
  late: { bg: '#2a2015', color: '#f2a65a' },
  absent: { bg: '#2a1719', color: '#f27d78' },
  upcoming: { bg: '#1e232d', color: '#d4d7dd' },
  cancelled: { bg: '#1e232d', color: '#9aa0ab' },
};
