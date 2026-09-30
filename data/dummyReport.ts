/**
 * 종합 리포트 — 프로그램(6회차)이 모두 끝난 뒤 학생마다 한 번 발급되는 최종 리포트
 * Firestore reports/{reportId} 문서와 같은 모양 (guardianUids · programRunId 는 서버가 붙이는 필드)
 *
 * 구성 (화면·PDF·공유 페이지가 같은 순서로 보여 준다)
 *   1. 표지      학생 · 프로그램 · 기간 · 캠퍼스 · 발급일 · 발급처
 *   2. 종합      종합 점수·등급, 학습 성향, 강점·발전 분야, 담임 총평
 *   3. 출석      6회 출석·지각·결석, 과제 제출
 *   4. 과목별    회차(과목)마다 점수·등급·성장지수, 역량 4~5개(또래 평균 비교), 강사 코멘트, 인상적이었던 점, 다음 단계
 *   5. 회차별    선생님 한마디 6회 타임라인
 *   6. 마무리    다음 프로그램 안내 · 인사
 *
 * 평가 체계
 *   과목별 역량(100점)의 평균 = 과목 점수, 과목 점수의 평균 = 종합 점수
 *   성장지수 = 첫 시간 관찰 점수(preScore) 대비 마지막 관찰 점수(postScore)의 차이
 *   등급: S 90점 이상 · A 75점 이상 · B 60점 이상 · C 그 미만
 */

// ── 타입 정의 ────────────────────────────────────────────

export type ReportGrade = 'S' | 'A' | 'B' | 'C';

export interface CompetencyScore {
  label: string;          // 역량 이름
  score: number;          // 0~100
  benchmark: number;      // 또래 평균 (비교 기준)
  description: string;    // 역량 설명
}

/** 과목(회차)별 평가 */
export interface ProgramReport {
  programId: string;
  sessionNumber: number;    // 회차 (1~6)
  date: string;             // 수업일 'YYYY.MM.DD'
  programName: string;      // 과목명
  programIcon?: string;     // (예전 화면 호환용 — 새 화면·PDF 에서는 쓰지 않음)
  instructorName: string;
  instructorTitle?: string; // 강사 소속
  attendance: number;       // 출석률 % (3차시 기준)
  overallScore: number;     // 과목 점수 0~100
  preScore: number;         // 첫 시간 관찰 점수 0~100
  postScore: number;        // 마지막 시간 관찰 점수 0~100
  growthIndex: number;      // 성장지수 = postScore - preScore
  grade: ReportGrade;
  competencies: CompetencyScore[];
  instructorComment: string;      // 강사 총평
  nextSteps: string[];            // 다음 단계 제안 (2~3개)
  highlights: string[];           // 인상적이었던 점
}

export interface AttendanceSummary {
  total: number;          // 전체 회차
  present: number;        // 출석
  late: number;           // 지각
  absent: number;         // 결석
  homeworkDone: number;   // 과제 제출 횟수
  homeworkTotal: number;  // 과제가 있었던 회차 수
}

/** 회차별 선생님 한마디 */
export interface SessionNote {
  sessionNumber: number;
  date: string;             // 'YYYY.MM.DD'
  topic: string;            // 과목명
  instructorName: string;
  status: 'present' | 'late' | 'absent';
  note: string;             // 그날 선생님 한마디
}

export interface NextProgramNotice {
  title: string;
  period: string;
  note: string;
}

export interface StudentReport {
  reportId: string;
  studentId: string;
  studentName: string;
  campusName: string;
  programTitle: string;      // 프로그램 이름
  campPeriod: string;        // 프로그램 기간 'YYYY.MM.DD – YYYY.MM.DD'
  issueDate: string;         // 발급일 'YYYY.MM.DD'
  issuedBy: string;          // 발급처 · 담당 (예: 'ThinkCampus 강남점 · 담당 이정민')
  totalScore: number;        // 종합 점수
  totalGrade: ReportGrade;
  overallComment: string;    // 담임 총평
  personalityType: string;   // 학습 성향 유형
  personalityDesc: string;   // 성향 설명
  strengthAreas: string[];   // 강점 분야
  growthAreas: string[];     // 발전 분야
  attendanceSummary: AttendanceSummary;
  programs: ProgramReport[];
  sessionNotes: SessionNote[];
  nextProgram?: NextProgramNotice;
  closingMessage: string;    // 마무리 인사
}

// ── 등급 계산 유틸 ────────────────────────────────────────

export function getGrade(score: number): ReportGrade {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  return 'C';
}

export const GRADE_LABEL: Record<ReportGrade, string> = {
  S: '최우수',
  A: '우수',
  B: '양호',
  C: '노력 필요',
};

export function getGradeColor(grade: ReportGrade): string {
  switch (grade) {
    case 'S': return '#d4b06a';
    case 'A': return '#e0c184';
    case 'B': return '#9aa0ab';
    case 'C': return '#7c8390';
  }
}

export function getGradeBg(grade: ReportGrade): string {
  switch (grade) {
    case 'S': return '#2a2417';
    case 'A': return '#2a2417';
    case 'B': return '#1e232d';
    case 'C': return '#1e232d';
  }
}

// ── 예시 리포트: 김민준 · 2026 ThinkCampus 토요 창의융합 ──────
//   회차·과목·강사는 data/dummyProgram.ts 의 6회차와 같다.
//   출석·과제·회차별 한마디는 data/dummyAttendance.ts 의 1~3회차와 이어진다.

export const DUMMY_REPORT: StudentReport = {
  reportId: 'report-2026-001',
  studentId: 'student-001',
  studentName: '김민준',
  campusName: 'ThinkCampus 강남점',
  programTitle: '2026 ThinkCampus 토요 창의융합',
  campPeriod: '2026.09.05 – 2026.11.14',
  issueDate: '2026.11.20',
  issuedBy: 'ThinkCampus 강남점 · 담당 이정민',
  totalScore: 83,
  totalGrade: 'A',
  personalityType: '탐구형 창의인재 (EXPLORER)',
  personalityDesc:
    '궁금한 것이 생기면 끝까지 파고드는 힘이 있습니다. 여러 과목에서 배운 내용을 서로 연결해 자기 생각을 만들어 내고, 충분히 준비한 뒤에는 또박또박 자신 있게 말합니다. 먼저 나서서 발표하기보다 깊이 있게 탐구하는 쪽을 즐기는 아이입니다.',
  overallComment:
    '민준이는 6회 수업 동안 눈에 띄게 자랐습니다. 첫 시간에는 영어로 말할 차례가 오면 잠시 머뭇거렸지만, 마지막 시간에는 모둠 발표를 스스로 맡아 이끌었습니다. 특히 AI 코딩 시간에는 수업에서 다룬 범위를 넘어 스스로 코드를 고쳐 오는 열의를 보였고, 과학 시간의 다리 만들기에서는 모둠에서 가장 창의적인 구조를 제안했습니다. 역사·토론처럼 처음엔 낯설어하던 과목에서도 매 시간 조금씩 더 손을 드는 모습이 대견했습니다. 자기 생각을 말로 표현하는 연습을 이어 간다면 탐구력과 표현력을 두루 갖춘 아이로 자랄 것입니다.',
  strengthAreas: ['AI/SW 코딩', '창의 융합 과학', '세계사 인문학'],
  growthAreas: ['영어 말하기 자신감', '토론에서 내 주장 펼치기'],
  attendanceSummary: { total: 6, present: 5, late: 1, absent: 0, homeworkDone: 5, homeworkTotal: 6 },
  programs: [
    {
      programId: 'prog-eng',
      sessionNumber: 1,
      date: '2026.09.05',
      programName: '글로벌 영어 커뮤니케이션',
      instructorName: '김지수',
      instructorTitle: '연세대학교 영어영문학과',
      attendance: 100,
      overallScore: 74,
      preScore: 60,
      postScore: 74,
      growthIndex: 14,
      grade: 'B',
      competencies: [
        { label: '어휘·표현', score: 78, benchmark: 70, description: '수업에서 배운 표현을 기억하고 알맞게 쓰는 힘' },
        { label: '듣고 이해하기', score: 80, benchmark: 68, description: '선생님의 영어 설명과 친구의 말을 알아듣는 힘' },
        { label: '말하기', score: 65, benchmark: 65, description: '머뭇거리지 않고 문장으로 이어 말하는 힘' },
        { label: '토론 참여', score: 70, benchmark: 67, description: '소그룹 토론에서 자기 의견을 내는 적극성' },
        { label: '발표 자신감', score: 72, benchmark: 64, description: '친구들 앞에서 영어로 발표할 때의 태도' },
      ],
      instructorComment:
        '단어를 많이 알고 있고 설명을 잘 알아듣습니다. 처음에는 말할 차례가 오면 머뭇거렸지만, 소그룹 토론이 두 번째로 돌아왔을 때는 준비한 문장을 끝까지 말했습니다. 틀려도 괜찮다는 걸 몸으로 익히면 말하기 점수는 금방 오를 아이입니다.',
      nextSteps: [
        '집에서 하루 한 문장 영어로 말해 보기 (오늘 있었던 일 한 가지)',
        '좋아하는 영어 동화·애니메이션을 자막 없이 한 번, 자막 켜고 한 번 보기',
        '영어 노트에 정리한 표현 30개를 소리 내어 읽기',
      ],
      highlights: ['소그룹 토론에서 친구들 의견을 잘 듣고 정리해 말함', '모르는 단어도 앞뒤 문장을 보고 뜻을 짐작해 냄'],
    },
    {
      programId: 'prog-world',
      sessionNumber: 2,
      date: '2026.09.19',
      programName: '세계사 인문학',
      instructorName: '박민준',
      instructorTitle: '고려대학교 사학과',
      attendance: 100,
      overallScore: 85,
      preScore: 65,
      postScore: 85,
      growthIndex: 20,
      grade: 'A',
      competencies: [
        { label: '흐름 이해', score: 90, benchmark: 72, description: '사건이 왜 일어났고 무엇으로 이어졌는지 파악하는 힘' },
        { label: '비교하기', score: 88, benchmark: 69, description: '다른 시대·다른 나라를 견주어 보는 힘' },
        { label: '내 생각 말하기', score: 82, benchmark: 67, description: '역사 이야기를 오늘의 우리와 연결해 생각하는 힘' },
        { label: '핵심 개념', score: 80, benchmark: 70, description: '수업에서 다룬 주요 낱말과 개념을 기억하는 정도' },
      ],
      instructorComment:
        '질문의 깊이가 남달랐습니다. 실크로드 이야기에서 "그럼 물건만 오간 게 아니라 병도 같이 옮겨졌겠네요?"라고 물어 반 전체가 감염병 이야기로 토론을 이어 갔습니다. 근대 산업혁명을 요즘 AI와 연결해 발표한 것도 기억에 남습니다.',
      nextSteps: [
        '세계사 어린이 만화·다큐멘터리 한 편 보고 가장 놀라운 장면 이야기해 보기',
        '관심 있는 나라 하나를 골라 지도에서 찾고 그 나라 이야기 찾아보기',
      ],
      highlights: ['산업혁명과 요즘 AI 를 스스로 연결해 발표', '실크로드 토론에서 반 전체 질문을 이끈 한마디'],
    },
    {
      programId: 'prog-korean',
      sessionNumber: 3,
      date: '2026.10.03',
      programName: '한국사 인문학',
      instructorName: '이서연',
      instructorTitle: '서울대학교 국사학과',
      attendance: 100,
      overallScore: 79,
      preScore: 68,
      postScore: 79,
      growthIndex: 11,
      grade: 'A',
      competencies: [
        { label: '시대 이해', score: 82, benchmark: 73, description: '그 시대 사람들이 어떻게 살았는지 그려 보는 힘' },
        { label: '자료 읽기', score: 75, benchmark: 64, description: '그림·지도·옛 글을 보고 뜻을 찾아내는 힘' },
        { label: '인물 이해', score: 80, benchmark: 68, description: '역사 인물이 왜 그렇게 행동했는지 생각해 보는 힘' },
        { label: '근현대사', score: 76, benchmark: 70, description: '가까운 시대의 큰 사건을 알고 있는 정도' },
      ],
      instructorComment:
        '18분 늦게 왔지만 자리에 앉자마자 바로 활동에 들어갔습니다. 역사 인물 카드 게임에서 인물의 선택을 근거를 들어 설명하는 모습이 좋았고, 조선 시대 정치 구조를 그림으로 그려 설명한 발표가 또렷했습니다. 근현대사는 아직 낯설어하니 이야기 위주로 접해 보면 좋겠습니다.',
      nextSteps: [
        '가까운 박물관·역사관에 가서 오늘 배운 시대의 유물 하나 찾아보기',
        '역사 동화나 어린이 역사책 중 근현대 편 한 권 읽기',
      ],
      highlights: ['조선 시대 정치 구조를 그림으로 정리해 발표', '역사 인물 카드 게임 모둠 1등'],
    },
    {
      programId: 'prog-debate',
      sessionNumber: 4,
      date: '2026.10.17',
      programName: '사고·창의력 디베이트',
      instructorName: '최현우',
      instructorTitle: '연세대학교 언론홍보영상학부',
      attendance: 100,
      overallScore: 76,
      preScore: 55,
      postScore: 76,
      growthIndex: 21,
      grade: 'A',
      competencies: [
        { label: '논리 세우기', score: 80, benchmark: 66, description: '주장 → 이유 → 예시 순서로 말하는 힘' },
        { label: '설득하기', score: 72, benchmark: 64, description: '듣는 사람이 고개를 끄덕이게 말하는 힘' },
        { label: '반박하기', score: 75, benchmark: 62, description: '상대 말의 빈틈을 찾아 되묻는 힘' },
        { label: '경청·공감', score: 85, benchmark: 70, description: '상대 의견을 끝까지 듣고 정확히 이해하는 힘' },
        { label: '발표 태도', score: 68, benchmark: 65, description: '목소리 크기 · 시선 · 자세' },
      ],
      instructorComment:
        '수업 초반에는 발언이 적었지만 상대 팀 말을 누구보다 잘 듣고 있었습니다. 후반 토론에서 "아까 말씀하신 근거는 예외가 있어요"라며 정확히 빈틈을 짚었고, 마지막 팀 발표를 자기가 하겠다고 손을 들었습니다. 목소리를 조금만 더 키우면 훨씬 설득력 있는 토론자가 됩니다.',
      nextSteps: [
        '저녁 식탁에서 "오늘의 찬반 한 가지" 정해 두 문장으로 말해 보기',
        '뉴스나 책에서 한 가지 주장을 고르고 이유를 두 개 찾아보기',
        '거울 앞에서 발표 연습 — 첫 문장만 크게 말해 보기',
      ],
      highlights: ['마지막 팀 발표를 스스로 맡아 이끔', '경청 부문 반 전체 1위'],
    },
    {
      programId: 'prog-steam',
      sessionNumber: 5,
      date: '2026.10.31',
      programName: '창의 융합 과학 STEAM',
      instructorName: '정다은',
      instructorTitle: '카이스트 화학과',
      attendance: 100,
      overallScore: 88,
      preScore: 70,
      postScore: 88,
      growthIndex: 18,
      grade: 'A',
      competencies: [
        { label: '탐구하기', score: 90, benchmark: 68, description: '"왜 그럴까?"를 실험으로 확인해 보는 힘' },
        { label: '설계하기', score: 88, benchmark: 65, description: '문제를 나누어 해결 방법을 그려 보는 힘' },
        { label: '창의적 발상', score: 92, benchmark: 70, description: '남들과 다른 방법을 떠올리는 힘' },
        { label: '협업', score: 85, benchmark: 72, description: '모둠에서 역할을 나누고 함께 해내는 힘' },
        { label: '결과 발표', score: 82, benchmark: 66, description: '실험 결과를 이유와 함께 설명하는 힘' },
      ],
      instructorComment:
        '종이 다리 만들기에서 삼각형을 겹치면 튼튼해진다는 걸 스스로 찾아내 모둠 구조를 바꿨고, 그 다리가 가장 많은 추를 버텼습니다. 발명 아이디어 시간에는 "비 오는 날 자동으로 펴지는 우산 가방"을 그려 친구들 박수를 받았습니다. 과학을 즐기는 마음이 그대로 보이는 아이입니다.',
      nextSteps: [
        '집에 있는 재료로 "가장 튼튼한 다리" 다시 만들어 보기 (빨대 · 종이 · 테이프)',
        '어린이 과학 잡지나 실험 영상 보고 한 가지 따라 해 보기',
        '지역 과학관 체험 프로그램 참여',
      ],
      highlights: ['종이 다리 챌린지 모둠 최우수', '발명 아이디어 스케치 발표에서 친구들 박수'],
    },
    {
      programId: 'prog-ai',
      sessionNumber: 6,
      date: '2026.11.14',
      programName: 'AI/SW 바이브 코딩',
      instructorName: '한지훈',
      instructorTitle: '포항공과대학교 컴퓨터공학과',
      attendance: 100,
      overallScore: 95,
      preScore: 72,
      postScore: 95,
      growthIndex: 23,
      grade: 'S',
      competencies: [
        { label: 'AI 이해', score: 96, benchmark: 68, description: 'AI 가 어떻게 배우고 답하는지 이해하는 정도' },
        { label: '코딩 구현', score: 95, benchmark: 64, description: '생각한 것을 블록·코드로 만들어 내는 힘' },
        { label: '순서대로 생각하기', score: 94, benchmark: 62, description: '문제를 작은 단계로 나누어 푸는 힘' },
        { label: '응용하기', score: 97, benchmark: 65, description: '배운 것을 새로운 상황에 써 보는 힘' },
        { label: '스스로 배우기', score: 98, benchmark: 67, description: '궁금한 것을 스스로 찾아보고 시도하는 힘' },
      ],
      instructorComment:
        '이번 학기 코딩 수업에서 가장 기억에 남는 학생입니다. 미니 게임 만들기에서 수업에 없던 점수판 기능을 스스로 붙였고, AI 그림 만들기에서는 낱말 순서를 바꾸면 결과가 달라진다는 걸 발견해 반 전체에 알려 주었습니다. 이 열의를 이어 갈 수 있게 집에서도 만들 거리를 하나 정해 주시면 좋겠습니다.',
      nextSteps: [
        '스크래치나 엔트리로 "나만의 미니 게임" 한 편 완성해 가족 앞에서 시연하기',
        '초등 파이썬 입문 책 또는 무료 온라인 강의 한 과정 시작',
        '만든 작품을 사진·영상으로 남겨 두는 나만의 포트폴리오 폴더 만들기',
      ],
      highlights: ['AI 그림 만들기에서 찾아낸 방법을 반 전체에 공유', '미니 게임 기획 발표 최우수', '스스로 배우기 부문 반 전체 1위'],
    },
  ],
  sessionNotes: [
    { sessionNumber: 1, date: '2026.09.05', topic: '글로벌 영어 커뮤니케이션', instructorName: '김지수', status: 'present', note: '단어를 많이 알고 잘 알아듣습니다. 말할 차례에는 조금 더 용기를 내 보면 좋겠어요.' },
    { sessionNumber: 2, date: '2026.09.19', topic: '세계사 인문학', instructorName: '박민준', status: 'present', note: '산업혁명과 요즘 AI 를 연결한 발표가 정말 인상적이었습니다. 질문이 깊어요.' },
    { sessionNumber: 3, date: '2026.10.03', topic: '한국사 인문학', instructorName: '이서연', status: 'late', note: '18분 늦게 왔지만 바로 활동에 들어갔고, 인물 카드 게임에서 근거를 들어 설명했습니다.' },
    { sessionNumber: 4, date: '2026.10.17', topic: '사고·창의력 디베이트', instructorName: '최현우', status: 'present', note: '상대 팀 말을 끝까지 듣고 빈틈을 정확히 짚었습니다. 마지막 발표를 스스로 맡았어요.' },
    { sessionNumber: 5, date: '2026.10.31', topic: '창의 융합 과학 STEAM', instructorName: '정다은', status: 'present', note: '종이 다리 만들기에서 삼각형 구조를 스스로 찾아내 모둠 최우수를 받았습니다.' },
    { sessionNumber: 6, date: '2026.11.14', topic: 'AI/SW 바이브 코딩', instructorName: '한지훈', status: 'present', note: '미니 게임에 점수판을 스스로 붙였습니다. 6회 동안 가장 크게 자란 시간이었어요.' },
  ],
  nextProgram: {
    title: '2026 ThinkCampus 겨울방학 STEAM 특강',
    period: '2026.12.05 – 2027.01.16 · 매주 토요일',
    note: '이번 학기에 보여 준 과학·코딩 쪽 강점을 더 깊게 다루는 6회 과정입니다. 앱에서 수강 신청 안내를 보내 드려요.',
  },
  closingMessage:
    '6회 동안 민준이와 함께해서 즐거웠습니다. 궁금한 점은 앱의 문의하기나 캠퍼스로 언제든 연락 주세요.',
};
