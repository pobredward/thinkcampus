/**
 * 출결·피드백 더미 데이터
 * 나중에 Firestore attendance / feedback 컬렉션으로 교체 예정
 *
 * 구조:
 *   StudentAttendance
 *     └─ sessions[]: SessionRecord
 *           ├─ 출결 상태 (present / late / absent)
 *           ├─ 참여도 점수 (0~100)
 *           ├─ 과제 완료 여부
 *           └─ 강사 피드백 (한 줄 코멘트)
 */

// ── 타입 ──────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'upcoming';

export interface SessionRecord {
  sessionId: string;
  sessionNumber: number;
  date: string;          // 'YYYY.MM.DD (요일)'
  topic: string;
  programIcon: string;
  instructorName: string;

  status: AttendanceStatus;
  checkinTime?: string;  // 출석 시 체크인 시간 (예: '09:03')
  lateMinutes?: number;  // 지각 분

  participationScore: number | null;  // 0~100, upcoming이면 null
  homeworkDone: boolean | null;       // null = 과제 없음

  feedback: string | null;            // 강사 한줄 피드백, upcoming이면 null
  highlights: string[];               // 이번 수업에서 잘한 점
  improvements: string[];             // 개선 권장 사항
}

export interface StudentAttendance {
  studentId: string;
  studentName: string;
  campusName: string;
  campPeriod: string;
  totalSessions: number;
  sessions: SessionRecord[];
}

// ── 유틸 ──────────────────────────────────────────────────

export function getStatusLabel(s: AttendanceStatus): string {
  switch (s) {
    case 'present':  return '출석';
    case 'late':     return '지각';
    case 'absent':   return '결석';
    case 'upcoming': return '예정';
  }
}

export function getStatusColor(s: AttendanceStatus): string {
  switch (s) {
    case 'present':  return '#16a34a';
    case 'late':     return '#d97706';
    case 'absent':   return '#dc2626';
    case 'upcoming': return '#6b7280';
  }
}

export function getStatusBg(s: AttendanceStatus): string {
  switch (s) {
    case 'present':  return '#f0fdf4';
    case 'late':     return '#fffbeb';
    case 'absent':   return '#fff1f2';
    case 'upcoming': return '#f9fafb';
  }
}

export function getParticipationLabel(score: number): string {
  if (score >= 90) return '매우 적극적';
  if (score >= 75) return '적극적';
  if (score >= 55) return '보통';
  return '소극적';
}

export function getParticipationColor(score: number): string {
  if (score >= 90) return '#7c3aed';
  if (score >= 75) return '#1d4ed8';
  if (score >= 55) return '#0369a1';
  return '#6b7280';
}

// ── 더미 데이터: 김민준 ───────────────────────────────────

export const DUMMY_ATTENDANCE_MINJUN: StudentAttendance = {
  studentId: 'student-001',
  studentName: '김민준',
  campusName: 'ThinkCampus 강남점',
  campPeriod: '2026.09.05 – 2026.11.14',
  totalSessions: 6,
  sessions: [
    {
      sessionId: 'sess-01',
      sessionNumber: 1,
      date: '2026.09.05 (토)',
      topic: '글로벌 영어 커뮤니케이션',
      programIcon: '🌍',
      instructorName: '김지수',
      status: 'present',
      checkinTime: '08:58',
      participationScore: 74,
      homeworkDone: true,
      feedback: '어휘력과 청취 이해력이 또래 대비 뛰어납니다. 말하기에서는 좀 더 자신감을 갖길 바랍니다.',
      highlights: ['소그룹 토론에서 팀원 의견을 적극 경청하고 정리함', '어려운 단어도 문맥으로 유추하는 능력 탁월'],
      improvements: ['영어로 말할 때 머뭇거리는 습관 개선 필요', '발화량을 더 늘려보세요'],
    },
    {
      sessionId: 'sess-02',
      sessionNumber: 2,
      date: '2026.09.19 (토)',
      topic: '세계사 인문학',
      programIcon: '🌐',
      instructorName: '박민준',
      status: 'present',
      checkinTime: '09:58',
      participationScore: 90,
      homeworkDone: true,
      feedback: '역사적 사고력이 탁월합니다. 산업혁명과 현대 AI를 연결한 발표가 매우 인상적이었습니다.',
      highlights: ['산업혁명 단원에서 현대 AI와의 연결 고리를 스스로 발표', '매 수업 예습 완료로 질문 수준이 월등히 높음'],
      improvements: ['비교 분석 시 더 다양한 관점을 활용해보세요'],
    },
    {
      sessionId: 'sess-03',
      sessionNumber: 3,
      date: '2026.10.03 (토)',
      topic: '한국사 인문학',
      programIcon: '🏯',
      instructorName: '이서연',
      status: 'late',
      checkinTime: '10:18',
      lateMinutes: 18,
      participationScore: 79,
      homeworkDone: true,
      feedback: '시대적 맥락 이해도가 높습니다. 지각이 있었으나 수업 참여는 매우 적극적이었습니다.',
      highlights: ['조선 시대 정치 구조 발표에서 도식화를 활용한 명쾌한 설명', '역사 인물 카드게임 우승'],
      improvements: ['시간 관리에 좀 더 신경 써주세요'],
    },
    {
      sessionId: 'sess-04',
      sessionNumber: 4,
      date: '2026.10.17 (토)',
      topic: '사고·창의력 디베이트',
      programIcon: '🎙️',
      instructorName: '최현우',
      status: 'upcoming',
      participationScore: null,
      homeworkDone: null,
      feedback: null,
      highlights: [],
      improvements: [],
    },
    {
      sessionId: 'sess-05',
      sessionNumber: 5,
      date: '2026.10.31 (토)',
      topic: '창의 융합 과학 STEAM',
      programIcon: '🔬',
      instructorName: '정다은',
      status: 'upcoming',
      participationScore: null,
      homeworkDone: null,
      feedback: null,
      highlights: [],
      improvements: [],
    },
    {
      sessionId: 'sess-06',
      sessionNumber: 6,
      date: '2026.11.14 (토)',
      topic: 'AI/SW 바이브 코딩',
      programIcon: '💻',
      instructorName: '한지훈',
      status: 'upcoming',
      participationScore: null,
      homeworkDone: null,
      feedback: null,
      highlights: [],
      improvements: [],
    },
  ],
};

// ── 더미 데이터: 김서연 ───────────────────────────────────

export const DUMMY_ATTENDANCE_SEOYEON: StudentAttendance = {
  studentId: 'student-002',
  studentName: '김서연',
  campusName: 'ThinkCampus 강남점',
  campPeriod: '2026.09.05 – 2026.11.14',
  totalSessions: 6,
  sessions: [
    {
      sessionId: 'sess-01',
      sessionNumber: 1,
      date: '2026.09.05 (토)',
      topic: '글로벌 영어 커뮤니케이션',
      programIcon: '🌍',
      instructorName: '김지수',
      status: 'present',
      checkinTime: '10:02',
      participationScore: 82,
      homeworkDone: true,
      feedback: '말하기 유창성이 뛰어나고 토론 참여도가 매우 높습니다. 팀원들과 적극적으로 소통했습니다.',
      highlights: ['팀 토론에서 자연스러운 리더십 발휘', '발음과 억양이 또래 대비 우수'],
      improvements: ['어휘 다양성을 더 키워보세요'],
    },
    {
      sessionId: 'sess-02',
      sessionNumber: 2,
      date: '2026.09.19 (토)',
      topic: '세계사 인문학',
      programIcon: '🌐',
      instructorName: '박민준',
      status: 'absent',
      participationScore: null,
      homeworkDone: null,
      feedback: '결석으로 인해 피드백이 제공되지 않았습니다. 담당 강사에게 보충 자료를 요청해주세요.',
      highlights: [],
      improvements: ['결석 시 미리 담당 강사에게 연락해주세요'],
    },
    {
      sessionId: 'sess-03',
      sessionNumber: 3,
      date: '2026.10.03 (토)',
      topic: '한국사 인문학',
      programIcon: '🏯',
      instructorName: '이서연',
      status: 'present',
      checkinTime: '09:59',
      participationScore: 88,
      homeworkDone: true,
      feedback: '한국사에 대한 깊은 이해를 바탕으로 날카로운 질문을 던졌습니다. 토론 참여가 인상적이었습니다.',
      highlights: ['근현대사 토론에서 독창적인 시각 제시', '역사 인물 카드게임 준우승'],
      improvements: ['사료 해석 능력을 더 키워보세요'],
    },
    {
      sessionId: 'sess-04',
      sessionNumber: 4,
      date: '2026.10.17 (토)',
      topic: '사고·창의력 디베이트',
      programIcon: '🎙️',
      instructorName: '최현우',
      status: 'upcoming',
      participationScore: null,
      homeworkDone: null,
      feedback: null,
      highlights: [],
      improvements: [],
    },
    {
      sessionId: 'sess-05',
      sessionNumber: 5,
      date: '2026.10.31 (토)',
      topic: '창의 융합 과학 STEAM',
      programIcon: '🔬',
      instructorName: '정다은',
      status: 'upcoming',
      participationScore: null,
      homeworkDone: null,
      feedback: null,
      highlights: [],
      improvements: [],
    },
    {
      sessionId: 'sess-06',
      sessionNumber: 6,
      date: '2026.11.14 (토)',
      topic: 'AI/SW 바이브 코딩',
      programIcon: '💻',
      instructorName: '한지훈',
      status: 'upcoming',
      participationScore: null,
      homeworkDone: null,
      feedback: null,
      highlights: [],
      improvements: [],
    },
  ],
};

export const ALL_ATTENDANCE = [DUMMY_ATTENDANCE_MINJUN, DUMMY_ATTENDANCE_SEOYEON];

// ── 통계 계산 유틸 ────────────────────────────────────────

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  upcoming: number;
  doneCount: number;       // 진행된 수업 수 (upcoming 제외)
  attendanceRate: number;  // 출석률 % (지각은 출석으로 계산)
  avgParticipation: number;
  homeworkRate: number;    // 과제 완료율 %
}

export function calcSummary(student: StudentAttendance): AttendanceSummary {
  const sessions = student.sessions;
  const present  = sessions.filter((s) => s.status === 'present').length;
  const late     = sessions.filter((s) => s.status === 'late').length;
  const absent   = sessions.filter((s) => s.status === 'absent').length;
  const upcoming = sessions.filter((s) => s.status === 'upcoming').length;
  const doneCount = present + late + absent;

  const attendanceRate = doneCount === 0 ? 100
    : Math.round(((present + late) / doneCount) * 100);

  const scoredSessions = sessions.filter((s) => s.participationScore !== null);
  const avgParticipation = scoredSessions.length === 0 ? 0
    : Math.round(scoredSessions.reduce((acc, s) => acc + (s.participationScore ?? 0), 0) / scoredSessions.length);

  const hwSessions = sessions.filter((s) => s.homeworkDone !== null);
  const hwDone = hwSessions.filter((s) => s.homeworkDone === true).length;
  const homeworkRate = hwSessions.length === 0 ? 100
    : Math.round((hwDone / hwSessions.length) * 100);

  return { present, late, absent, upcoming, doneCount, attendanceRate, avgParticipation, homeworkRate };
}
