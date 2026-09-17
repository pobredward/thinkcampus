/**
 * 회차 상태 배지 색 (웹 programView.STATUS_BADGE 의 Tailwind 클래스와 같은 색)
 */

import type { DayStatus } from '../../data/programView';

export const STATUS_BADGE: Record<DayStatus, { bg: string; color: string }> = {
  present: { bg: '#f0fdf4', color: '#15803d' },
  late: { bg: '#fffbeb', color: '#b45309' },
  absent: { bg: '#fef2f2', color: '#dc2626' },
  upcoming: { bg: '#eff6ff', color: '#1d4ed8' },
  cancelled: { bg: '#f3f4f6', color: '#4b5563' },
};
