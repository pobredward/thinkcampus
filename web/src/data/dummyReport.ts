/**
 * 더미 리포트 데이터
 * 나중에 Firestore reports 컬렉션으로 교체 예정
 *
 * 평가 체계:
 *   각 프로그램별로 4~5개의 세부 역량 항목을 평가 (100점 만점)
 *   전체 종합 점수 = 6개 프로그램 평균
 *   성장지수 = (캠프 전 자기평가 대비 캠프 후 강사 평가 차이)
 */

// ── 타입 정의 ────────────────────────────────────────────

export interface CompetencyScore {
  label: string;          // 역량 이름
  score: number;          // 0~100
  benchmark: number;      // 또래 평균 (비교 기준)
  description: string;    // 역량 설명
}

export interface ProgramReport {
  programId: string;
  programName: string;
  programIcon: string;
  instructorName: string;
  attendance: number;       // 출석률 %
  overallScore: number;     // 프로그램 종합 점수 0~100
  preScore: number;         // 캠프 전 자기평가 0~100
  postScore: number;        // 캠프 후 강사 평가 0~100
  growthIndex: number;      // 성장지수 = postScore - preScore
  grade: 'S' | 'A' | 'B' | 'C';  // 등급
  competencies: CompetencyScore[];
  instructorComment: string;      // 강사 총평
  nextSteps: string[];            // 향후 발전 방향 제안 (2~3개)
  highlights: string[];           // 캠프 중 인상적이었던 점
}

export interface StudentReport {
  reportId: string;
  studentId: string;
  studentName: string;
  campusName: string;
  campPeriod: string;        // 캠프 기간
  issueDate: string;         // 발급일
  totalScore: number;        // 전체 종합 점수
  totalGrade: 'S' | 'A' | 'B' | 'C';
  overallComment: string;    // 담임 총평
  personalityType: string;   // 학습 성향 유형
  personalityDesc: string;   // 성향 설명
  strengthAreas: string[];   // 강점 분야
  growthAreas: string[];     // 발전 필요 분야
  programs: ProgramReport[];
}

// ── 등급 계산 유틸 ────────────────────────────────────────

export function getGrade(score: number): 'S' | 'A' | 'B' | 'C' {
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  return 'C';
}

export function getGradeColor(grade: 'S' | 'A' | 'B' | 'C'): string {
  switch (grade) {
    case 'S': return '#d4b06a';
    case 'A': return '#e0c184';
    case 'B': return '#9aa0ab';
    case 'C': return '#7c8390';
  }
}

export function getGradeBg(grade: 'S' | 'A' | 'B' | 'C'): string {
  switch (grade) {
    case 'S': return '#2a2417';
    case 'A': return '#2a2417';
    case 'B': return '#1e232d';
    case 'C': return '#1e232d';
  }
}

// ── 더미 데이터 ───────────────────────────────────────────

export const DUMMY_REPORT: StudentReport = {
  reportId: 'report-2026-001',
  studentId: 'student-001',
  studentName: '김민준',
  campusName: 'ThinkCampus 강남점',
  campPeriod: '2026.09.05 – 2026.11.14',
  issueDate: '2026.11.21',
  totalScore: 82,
  totalGrade: 'A',
  personalityType: '탐구형 창의인재 (EXPLORER)',
  personalityDesc:
    '새로운 지식에 대한 호기심이 강하고, 다양한 분야를 연결하여 사고하는 융합적 사고력이 뛰어납니다. 발표보다 깊이 있는 탐구를 즐기며, 충분한 준비 후 자신 있게 의견을 표현하는 성향입니다.',
  overallComment:
    '민준이는 6회 과정을 통해 눈에 띄는 성장을 보여주었습니다. 특히 AI/SW 코딩 분야에서 타의 추종을 불허하는 집중력을 발휘했으며, 디베이트 수업에서는 초반의 소극적인 자세를 극복하고 마지막 회차에서 팀 발표를 이끄는 리더십을 보여주었습니다. 인문학 계열 과목에서도 꾸준한 노력으로 평균 이상의 역량을 달성했습니다.',
  strengthAreas: ['AI/SW 코딩', '창의 융합 과학', '세계사 인문학'],
  growthAreas: ['발표·표현력', '토론 논리 구성'],
  programs: [
    {
      programId: 'prog-eng',
      programName: '글로벌 영어 커뮤니케이션',
      programIcon: '🌍',
      instructorName: '김지수',
      attendance: 100,
      overallScore: 74,
      preScore: 60,
      postScore: 74,
      growthIndex: 14,
      grade: 'B',
      competencies: [
        { label: '어휘·표현력', score: 78, benchmark: 70, description: '핵심 표현 습득 및 활용 능력' },
        { label: '청취 이해력', score: 80, benchmark: 68, description: '원어민 발화 이해 및 요점 파악' },
        { label: '말하기 유창성', score: 65, benchmark: 65, description: '자연스러운 영어 발화 속도와 흐름' },
        { label: '토론 참여도', score: 70, benchmark: 67, description: '영어 토론 참여 적극성 및 논리성' },
        { label: '발표 자신감', score: 72, benchmark: 64, description: '영어 발표 시 자신감과 태도' },
      ],
      instructorComment:
        '어휘력과 청취 능력은 또래보다 우수합니다. 말하기에서 다소 머뭇거리는 모습이 있었으나, 수업 후반부로 갈수록 발화량이 눈에 띄게 늘었습니다. 꾸준한 영어 노출 환경 조성을 권장합니다.',
      nextSteps: [
        '원어민 화상 영어 주 2회 이상 진행 권장',
        'TEDx 영어 강연 청취로 발표 표현 습득',
        '영어 일기 쓰기로 작문 능력 보완',
      ],
      highlights: ['소그룹 토론에서 팀원의 의견을 적극 경청하고 정리하는 모습이 인상적', '어려운 단어도 문맥을 통해 유추하는 능력 탁월'],
    },
    {
      programId: 'prog-world',
      programName: '세계사 인문학',
      programIcon: '🌐',
      instructorName: '박민준',
      attendance: 100,
      overallScore: 85,
      preScore: 65,
      postScore: 85,
      growthIndex: 20,
      grade: 'A',
      competencies: [
        { label: '역사적 사고력', score: 90, benchmark: 72, description: '사건의 인과관계와 흐름을 파악하는 능력' },
        { label: '비교·분석력', score: 88, benchmark: 69, description: '다양한 문명·시대를 비교 분석하는 능력' },
        { label: '비판적 사고', score: 82, benchmark: 67, description: '역사적 관점에서 현대 문제를 바라보는 능력' },
        { label: '핵심 개념 이해', score: 80, benchmark: 70, description: '주요 역사 개념 및 용어 습득 수준' },
      ],
      instructorComment:
        '역사적 사고력이 뛰어나며, 수업 중 질문의 깊이가 타 학생들에 비해 매우 심화된 수준이었습니다. 문명 비교 토론에서는 스스로 새로운 관점을 제시하는 창의성을 보여주었습니다.',
      nextSteps: [
        '세계사 관련 다큐멘터리 시청 (EBS 문명 시리즈 등)',
        '관심 시대의 역사 소설 읽기',
        '역사 관련 독서 후 독후감 작성 습관화',
      ],
      highlights: ['산업혁명 단원에서 현대 AI와의 연결 고리를 스스로 발표', '매 수업 예습 완료로 질문 수준이 월등히 높았음'],
    },
    {
      programId: 'prog-korean',
      programName: '한국사 인문학',
      programIcon: '🏯',
      instructorName: '이서연',
      attendance: 100,
      overallScore: 79,
      preScore: 68,
      postScore: 79,
      growthIndex: 11,
      grade: 'B',
      competencies: [
        { label: '시대적 맥락 이해', score: 82, benchmark: 73, description: '각 시대의 정치·사회·문화적 배경 파악' },
        { label: '사료 해석 능력', score: 75, benchmark: 64, description: '역사 자료를 읽고 해석하는 능력' },
        { label: '역사 인물 분석', score: 80, benchmark: 68, description: '주요 역사 인물의 행동과 영향력 분석' },
        { label: '근현대사 이해', score: 76, benchmark: 70, description: '근현대사 핵심 사건 및 배경 이해 수준' },
      ],
      instructorComment:
        '시대적 맥락을 잘 파악하고, 역사 인물 카드게임에서 적극적으로 참여했습니다. 근현대사 부분에서 더 깊이 있는 학습이 이루어진다면 한국사 전반에 대한 이해도가 한층 높아질 것입니다.',
      nextSteps: [
        '한국사능력검정시험 3급 목표 학습 권장',
        '박물관·전시회 방문으로 역사 실체 체험',
        '역사 드라마·다큐 비판적으로 시청하기',
      ],
      highlights: ['조선 시대 정치 구조 발표에서 도식화를 활용한 명쾌한 설명', '역사 인물 카드게임 우승'],
    },
    {
      programId: 'prog-debate',
      programName: '사고·창의력 디베이트',
      programIcon: '🎙️',
      instructorName: '최현우',
      attendance: 100,
      overallScore: 76,
      preScore: 55,
      postScore: 76,
      growthIndex: 21,
      grade: 'B',
      competencies: [
        { label: '논리적 구성력', score: 80, benchmark: 66, description: '주장-근거-반박 구조로 논점을 전개하는 능력' },
        { label: '설득력', score: 72, benchmark: 64, description: '상대방을 논리적으로 설득하는 능력' },
        { label: '반박·재구성', score: 75, benchmark: 62, description: '상대 논점에 즉각적으로 대응하는 능력' },
        { label: '경청·공감', score: 85, benchmark: 70, description: '상대방 의견을 정확히 이해하고 반영하는 능력' },
        { label: '발표 자신감', score: 68, benchmark: 65, description: '발표 시 목소리·시선·자세 등 표현력' },
      ],
      instructorComment:
        '초반에는 발언 횟수가 적었으나, 4회차부터 급격한 성장세를 보였습니다. 특히 경청 능력이 매우 뛰어나 상대 발언의 허점을 정확히 짚어내는 모습이 인상적이었습니다. 발표 자신감을 더 키운다면 탁월한 토론자가 될 수 있습니다.',
      nextSteps: [
        '학교 토론 동아리 또는 모의 UN 참가 권장',
        '매일 뉴스 1건 읽고 찬반 정리하는 습관',
        'TED 강연 보며 발표 기법 학습',
      ],
      highlights: ['마지막 회차 팀 디베이트에서 팀 발표를 직접 이끔', '경청 역량 부문 전체 1위'],
    },
    {
      programId: 'prog-steam',
      programName: '창의 융합 과학 STEAM',
      programIcon: '🔬',
      instructorName: '정다은',
      attendance: 100,
      overallScore: 88,
      preScore: 70,
      postScore: 88,
      growthIndex: 18,
      grade: 'A',
      competencies: [
        { label: '과학적 탐구력', score: 90, benchmark: 68, description: '가설 설정 및 실험 설계 능력' },
        { label: '공학적 사고', score: 88, benchmark: 65, description: '문제를 구조적으로 분석하고 해결책을 설계하는 능력' },
        { label: '창의적 발상', score: 92, benchmark: 70, description: '기존 방식을 벗어난 독창적 아이디어 제안 능력' },
        { label: '협업 능력', score: 85, benchmark: 72, description: '모둠 활동에서의 협력과 역할 분담 능력' },
        { label: '결과 발표력', score: 82, benchmark: 66, description: '실험 결과를 논리적으로 설명하는 능력' },
      ],
      instructorComment:
        '브릿지 설계 챌린지에서 가장 창의적인 구조를 제안했으며, 팀원들과 협력하여 실제로 구현해냈습니다. 과학·공학적 사고력이 탁월하고, 발명 아이디어 스케치 발표에서 독창성이 돋보였습니다.',
      nextSteps: [
        '과학 올림피아드 또는 발명 경진대회 참가',
        '아두이노·라즈베리파이 입문 과정 체험',
        '관심 분야 STEAM 서적 읽기 (예: 〈파인만 씨 농담도 잘 하시네〉)',
      ],
      highlights: ['브릿지 챌린지 팀 최우수상', '발명 아이디어로 팀원들의 박수를 받음'],
    },
    {
      programId: 'prog-ai',
      programName: 'AI/SW 바이브 코딩',
      programIcon: '💻',
      instructorName: '한지훈',
      attendance: 100,
      overallScore: 95,
      preScore: 72,
      postScore: 95,
      growthIndex: 23,
      grade: 'S',
      competencies: [
        { label: 'AI 개념 이해', score: 96, benchmark: 68, description: 'AI의 원리와 생활 적용 사례 이해 수준' },
        { label: '코딩 구현력', score: 95, benchmark: 64, description: '주어진 문제를 코드로 구현하는 능력' },
        { label: '논리·알고리즘 사고', score: 94, benchmark: 62, description: '문제를 단계적으로 분해하고 해결하는 사고력' },
        { label: '창의적 응용', score: 97, benchmark: 65, description: '배운 내용을 새로운 상황에 창의적으로 적용' },
        { label: '자기주도 학습', score: 98, benchmark: 67, description: '스스로 탐구하고 학습을 확장하는 능력' },
      ],
      instructorComment:
        '이 학생은 제가 본 청소년 코딩 수업에서 가장 인상적인 학생 중 하나입니다. 수업 범위를 넘어 스스로 심화 코드를 작성해 오고, AI 이미지 생성 실습에서 직접 새로운 프롬프트 패턴을 발견했습니다. SW 분야 진로를 강력히 권장합니다.',
      nextSteps: [
        '파이썬 기초 → 중급 과정 온라인 강의 수강 (코세라, 프로그래머스)',
        '앱 개발 공모전 또는 해커톤 참가',
        '깃허브 계정 개설 후 프로젝트 관리 시작',
      ],
      highlights: ['수업 중 AI 프롬프트 신기법 발견으로 전체 공유', '미니 앱 기획 발표 최우수 선정', '자기주도 학습 역량 전체 1위'],
    },
  ],
};
