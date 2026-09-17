/**
 * 더미 "이전 수강 이력" — 홈 아래쪽 버튼 · 이전 수강 이력 화면(/main/history)에서 사용
 * 나중에 Firestore enrollments(status: completed) 조회로 교체 예정 (웹·모바일 동일 파일)
 */

export interface PastProgram {
  programId: string;
  title: string;
  subtitle: string;
  startDate: string; // 'YYYY.MM.DD'
  endDate: string;
  totalSessions: number;
  totalHours: number;
}

export const DUMMY_PAST_PROGRAMS: PastProgram[] = [
  {
    programId: 'past-prog-001',
    title: '2026 ThinkCampus 여름학기',
    subtitle: '수학·과학 집중 캠프',
    startDate: '2026.07.20',
    endDate: '2026.08.14',
    totalSessions: 6,
    totalHours: 12,
  },
  {
    programId: 'past-prog-002',
    title: '2026 영어 스피킹 특강',
    subtitle: '원어민 회화 집중 과정',
    startDate: '2026.05.02',
    endDate: '2026.05.23',
    totalSessions: 4,
    totalHours: 8,
  },
];
