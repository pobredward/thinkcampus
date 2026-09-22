/**
 * 더미 프로그램 데이터 — 토요 특기적성형
 * 나중에 Firestore programs / sessions 컬렉션으로 교체 예정
 *
 * 운영 구조:
 *   격주 토요일 | 1회당 3차시(120분) | 총 6회 | 총 18차시
 *   2026.09.05 ~ 2026.11.14 (약 2.5개월)
 *   시작 10:00 · 종료 12:00
 *   장소: 강남구 청소년수련관 3층 301호
 */

export interface Instructor {
  name: string;
  title: string;       // 소속/직함
  bio: string;
}

export interface LessonPlan {
  lessonNumber: number;  // 차시 번호
  topic: string;         // 차시 주제
  slideUrl?: string;     // Canva 공개 보기 링크
  activityUrl?: string;  // 활동지 링크
}

export interface Session {
  id: string;
  sessionNumber: number;
  date: string;           // 'YYYY.MM.DD (요일)' — 항상 토요일
  startTime: string;      // 'HH:MM' 수업 시작 시각
  endTime: string;        // 'HH:MM' 수업 종료 시각
  durationMinutes: number; // 120 — 회차당 수업 시간 (분)
  sessionHours: number;   // 3 — 차시 수 (1차시=40분 기준)
  topic: string;
  programCode?: string;   // 지자체 계약 코드 ex) HM-WA-16
  description: string;
  objectives?: string[];
  teachingMethod?: string;
  instructor: Instructor;
  curriculum: string[];
  lessonPlans?: LessonPlan[];
  planUrl?: string;
  materials: string[];
  location: string;       // 회차별 장소 (기본값은 Program.location)
  rotationNote?: string;
  isCancelled: boolean;   // 공휴일·휴강 여부
  cancelReason?: string;  // 예: '추석 연휴'
  makeUpDate?: string;    // 보강 날짜 (휴강 시)
  qna?: SessionQnA[];     // 이 회차에 대해 자주 묻는 질문
}

export interface SessionQnA {
  q: string;
  a: string;
}

export interface Program {
  id: string;
  campusId: string;
  title: string;
  subtitle: string;
  category: string;
  contractCode: string;    // 지자체 계약 번호
  startDate: string;       // '2026.09.05' — 프로그램 시작일
  endDate: string;         // '2026.11.14' — 프로그램 종료일
  fixedDay: string;        // '토' — 고정 요일
  frequency: 'weekly' | 'biweekly'; // 매주 | 격주
  startTime: string;       // '10:00' — 고정 시작 시각
  endTime: string;         // '12:00' — 고정 종료 시각
  sessionHours: number;    // 3 — 회차당 차시 수
  totalSessions: number;   // 6 — 총 회차 수
  totalHours: number;      // 18 — 총 차시 수 (계약·정산 단위)
  location: string;        // 운영 장소
  targetGrade: string;     // 대상 학년 (예: '초등 3~6학년')
  maxStudents: number;     // 최대 수강 인원
  sessions: Session[];

  // ── 수강 안내용 (수강 예정 화면에서 한 번에 보여 줌) ──
  status?: 'active' | 'upcoming' | 'completed'; // 이 학생의 수강 상태 (없으면 active)
  enrolledAt?: string;        // 수강 확정일 'YYYY.MM.DD'
  overview?: string;          // 프로그램 소개
  features?: string[];        // 수업 특징
  commonMaterials?: string[]; // 매 회차 공통 준비물
  notices?: string[];         // 공지사항
  breaks?: ProgramBreak[];    // 회차 사이 휴강일

  // ── 프로그램 안내 (카테고리 화면: 목적 · 공지 · 규정 · Q&A) ──
  host?: string;              // 주최·운영 (예: '강남구청 · 씽크캠퍼스')
  purpose?: string;           // 도입 취지 — 지자체가 이 프로그램을 운영하는 이유
  rules?: ProgramRule[];      // 수업 규정·지침 (없으면 기본 규정 — programGuide.ts)
  faq?: ProgramQnA[];         // 이 프로그램만의 Q&A (기본 Q&A 앞에 붙는다)

  // ── 일시 및 장소 → 오시는 길 ──
  mapQuery?: string;               // 지도 앱에서 찾을 이름 (예: '강남구 청소년수련관')
  directions?: ProgramDirection[]; // 오시는 길 안내 (대중교통 · 주차 · 도착하면 · 데려갈 때 …)
}

/** 오시는 길 한 줄 — 대중교통이 정해지면 { label: '대중교통', text: '…' } 을 맨 앞에 추가 */
export interface ProgramDirection {
  label: string;
  text: string;
}

export interface ProgramRule {
  title: string;
  body: string;
  important?: boolean; // 어기면 불이익(탈락·수료 불가 등)이 있는 항목
}

export interface ProgramQnA {
  topic: string; // '준비물' · '지각·결석' · '모임·픽업' · '간식·음료' · '점심' …
  q: string;
  a: string;
}

export interface ProgramBreak {
  date: string;   // 'YYYY.MM.DD (요일)'
  reason: string; // 예: '신정 연휴 휴강'
}

// ── 더미 데이터 ──────────────────────────────────────────

export const DUMMY_PROGRAM: Program = {
  id: 'prog-001',
  status: 'active',
  campusId: 'campus-001',
  title: '2026 ThinkCampus 토요 창의융합',
  subtitle: '초등 특기적성 프로그램',
  category: '특기적성',
  contractCode: '2026-강남-토특-001',
  startDate: '2026.09.05',
  endDate: '2026.11.14',
  fixedDay: '토',
  frequency: 'biweekly',
  startTime: '10:00',
  endTime:   '12:00',
  sessionHours: 3,          // 1회 = 3차시 (40분×3 = 120분)
  totalSessions: 6,
  totalHours: 18,           // 3차시 × 6회 = 18차시
  location: '강남구 청소년수련관 3층 301호',
  targetGrade: '초등 3~6학년',
  maxStudents: 20,

  mapQuery: '강남구 청소년수련관',
  directions: [
    { label: '주차', text: '수련관 주차는 2시간 무료예요. 1층 안내데스크에서 차량을 등록해 주세요.' },
    { label: '도착하면', text: '수업 10분 전(9:50)까지 3층 301호 교실 앞으로 와 주세요. 선생님이 출석을 확인하고 맞이해요.' },
    { label: '데려갈 때', text: '수업이 끝나면 선생님이 1층 로비까지 함께 내려가 보호자께 인계해요.' },
  ],

  host: '강남구청 교육지원과 · 씽크캠퍼스 운영',
  purpose:
    '토요일 오전을 알차게 보낼 수 있도록 강남구가 지원하는 무료 특기적성 프로그램입니다. 학교에서 하기 어려운 체험·토론·발표 수업을 대학생 멘토와 함께하며, 스스로 생각하고 말하는 힘을 기르는 것이 목표입니다.',
  overview:
    '격주 토요일마다 역사·과학·경제·영어 등 서로 다른 주제를 하나씩 깊게 다룹니다. 매 회차 활동지와 발표로 마무리하고, 수업이 끝나면 앱에 출결과 선생님 피드백이 올라옵니다.',
  features: [
    '한 반 20명 이하, 대학생 멘토 수업',
    '매 회차 활동지·발표로 마무리',
    '회차별 리포트와 종합 리포트 제공',
  ],
  commonMaterials: ['필기도구', '개인 물병'],
  notices: [
    '수업 10분 전(9:50)까지 3층 301호로 와 주세요.',
    '수련관 주차는 2시간 무료입니다. (1층 안내데스크에서 차량 등록)',
    '결석·지각할 때는 수업 전날까지 캠퍼스로 연락해 주세요.',
    '마지막 수업(11월 14일)이 끝나면 종합 리포트가 발급돼요.',
  ],

  sessions: [
    // ── 1회차 ──────────────────────────────────────────
    {
      id: 'sess-01',
      sessionNumber: 1,
      date: '2026.09.05 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '글로벌 영어 커뮤니케이션',
      description:
        '원어민 수준의 영어 표현을 익히고, 실전 토론과 발표를 통해 자신감을 키웁니다.',
      instructor: {
        name: '김지수',
        title: '연세대학교 영어영문학과 4학년',
        bio: '토익 990점, OPIC AL 등급 보유. 3년간 영어 튜터링 경력.',
      },
      curriculum: [
        '아이스브레이킹 & 자기소개 (영어)',
        '주제별 핵심 표현 30선 학습',
        '소그룹 토론: 글로벌 이슈',
        '개인 발표 & 피드백',
      ],
      materials: ['영어 노트', '펜'],
      location: '강남구 청소년수련관 3층 301호',
      qna: [
        { q: '영어를 잘 못해도 참여할 수 있나요?', a: '네. 수준별로 소그룹을 나누고, 처음에는 짧은 문장부터 말해 보도록 강사가 옆에서 도와줍니다.' },
        { q: '영어 노트는 어떤 걸 준비하면 되나요?', a: '줄이 있는 일반 노트면 충분합니다. 수업에서 배운 표현 30개를 정리하는 용도로 씁니다.' },
      ],
      isCancelled: false,
    },
    // ── 2회차 ──────────────────────────────────────────
    {
      id: 'sess-02',
      sessionNumber: 2,
      date: '2026.09.19 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '세계사 인문학 — 교류와 충돌',
      programCode: 'HM-WA-16',
      description:
        '단순한 역사 암기를 넘어, 스토리텔링 기반의 "세계 여행" 테마로 살아있는 세계사를 탐구합니다. 문명 간 교류와 충돌이 오늘날 세계를 어떻게 빚어냈는지를 다각화된 시각으로 바라봅니다.',
      objectives: [
        '역사·철학·경제·문화 등 다양한 분야를 스토리텔링으로 흥미롭게 탐구',
        '다양한 문제와 사실에 대한 사고력 향상 및 자기주도적 작문력 상승',
        '다각화된 시각으로 사실과 문제를 바라보는 자세 체득',
      ],
      teachingMethod:
        '수업 시작 전 동기부여(인문학이 왜 필요한가)로 분위기를 조성하고, 영상·퀴즈·게임을 활용한 참여형 수업을 진행합니다. 짝 토론 방식으로 발언 기회를 균등하게 배분하며, 글씨체·내용 충실도까지 꼼꼼히 피드백합니다.',
      instructor: {
        name: '박민준',
        title: '고려대학교 사학과 4학년',
        bio: '전국 역사 경시대회 금상. 중학생 대상 역사 멘토링 2년. SMIS CAMP HM-WA 담당 강사.',
      },
      curriculum: [
        '수업 오리엔테이션 — 세계사를 왜 배워야 하는가?',
        '1차시: 동서양의 만남과 실크로드',
        '2차시: 제국의 충돌 — 몽골·오스만·유럽의 교차',
        '3차시: 근대 세계의 탄생과 우리에게 남긴 것',
        '짝 토론 & 활동지 작성',
        '핵심 개념 정리 퀴즈',
      ],
      lessonPlans: [
        {
          lessonNumber: 1,
          topic: '동서양의 만남과 실크로드',
          slideUrl: 'https://www.canva.com/design/DAG1m126gxE/LmLSOxeETW1QqLwU4-2HqA/view?utm_content=DAG1m126gxE&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hcb00bf2429',
          activityUrl: 'https://www.canva.com/design/DAG68HBVG4g/U17aDnZLpYO9KL12JlsmKQ/view?utm_content=DAG68HBVG4g&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h5d511e4ce8',
        },
        {
          lessonNumber: 2,
          topic: '제국의 충돌 — 몽골·오스만·유럽의 교차',
          slideUrl: 'https://www.canva.com/design/DAG7ya5cTJY/HgxFC0tu0vek0scC6Rywmw/view?utm_content=DAG7ya5cTJY&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h1f55aa313d',
          activityUrl: 'https://www.canva.com/design/DAG68HBVG4g/U17aDnZLpYO9KL12JlsmKQ/view?utm_content=DAG68HBVG4g&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h5d511e4ce8',
        },
        {
          lessonNumber: 3,
          topic: '근대 세계의 탄생과 우리에게 남긴 것',
          slideUrl: 'https://www.canva.com/design/DAG7yjt_fi4/_FOQ1CP1o9Zg9iXZCTIsaw/view?utm_content=DAG7yjt_fi4&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h8ef2555189',
          activityUrl: 'https://www.canva.com/design/DAG68HBVG4g/U17aDnZLpYO9KL12JlsmKQ/view?utm_content=DAG68HBVG4g&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h5d511e4ce8',
        },
      ],
      planUrl: 'https://www.canva.com/design/DAG1l3bSw9Q/8wcgk4stSxXJ8pPyHUW11w/view?utm_content=DAG1l3bSw9Q&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h5cf781b468',
      rotationNote: '그룹별 로테이션 수업 (차시별 40분). L1~L4 그룹이 순차적으로 수업을 받습니다.',
      materials: ['필기도구', '색연필 (지도 표시용)', '활동지 (강사 배부)'],
      location: '강남구 청소년수련관 3층 301호',
      qna: [
        { q: '활동지는 집에 가져오나요?', a: '네. 수업이 끝나면 완성한 활동지를 가져갑니다. 집에서 함께 읽어 보시면 복습에 도움이 됩니다.' },
        { q: '색연필이 없으면 어떻게 하나요?', a: '수련관에 여분이 있어 빌려 쓸 수 있습니다. 다만 수가 넉넉하지 않아 가능하면 챙겨 주세요.' },
      ],
      isCancelled: false,
    },
    // ── 3회차 ── (10.04 추석 다음 주 격주)
    {
      id: 'sess-03',
      sessionNumber: 3,
      date: '2026.10.03 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '한국사 인문학 — 우리 역사 깊이 읽기',
      description:
        '교과서를 넘어 한국사의 숨겨진 이야기와 현재적 의미를 탐구합니다.',
      instructor: {
        name: '이서연',
        title: '서울대학교 국사학과 3학년',
        bio: '한국사능력검정시험 1급. 청소년 역사 캠프 진행 경험.',
      },
      curriculum: [
        '고조선부터 고려까지 흐름 정리',
        '조선의 정치 구조 이해',
        '근현대사 주요 사건 심층 토론',
        '역사 인물 카드게임',
      ],
      materials: ['필기도구'],
      location: '강남구 청소년수련관 3층 301호',
      qna: [
        { q: '역사를 처음 배우는 아이도 따라갈 수 있나요?', a: '이야기와 카드게임 중심으로 진행해서 사전 지식이 없어도 충분히 참여할 수 있습니다.' },
        { q: '집에서 미리 볼 만한 책이 있나요?', a: '『용선생 만화 한국사』 1~2권을 가볍게 읽고 오면 수업이 더 재미있습니다.' },
      ],
      isCancelled: false,
    },
    // ── 4회차 ──────────────────────────────────────────
    {
      id: 'sess-04',
      sessionNumber: 4,
      date: '2026.10.17 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '사고·창의력 디베이트',
      description:
        '논리적 사고와 설득력 있는 주장 전개 방법을 배우고, 실전 디베이트를 경험합니다.',
      instructor: {
        name: '최현우',
        title: '연세대학교 언론홍보영상학부 4학년',
        bio: '전국 고교 토론대회 우승. 디베이트 코치 자격 보유.',
      },
      curriculum: [
        '논증 구조 이해 (주장-근거-반박)',
        '찬반 양측 입장 분석 훈련',
        '팀 디베이트: 인공지능 vs 인간',
        '심사 피드백 & 개인 발전 포인트',
      ],
      materials: ['필기도구', '포스트잇'],
      location: '강남구 청소년수련관 3층 301호',
      qna: [
        { q: '디베이트 주제는 미리 알 수 있나요?', a: '수업 3일 전 알림으로 주제를 안내합니다. 아이와 찬성·반대 의견을 한 번씩 이야기해 보세요.' },
        { q: '말하기를 부끄러워하는 아이도 괜찮나요?', a: '포스트잇에 먼저 생각을 적고 발표하는 방식이라 부담이 적습니다. 발표 순서도 강제하지 않습니다.' },
      ],
      isCancelled: false,
    },
    // ── 5회차 ──────────────────────────────────────────
    {
      id: 'sess-05',
      sessionNumber: 5,
      date: '2026.10.31 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '창의 융합 과학 STEAM',
      description:
        '과학·기술·공학·예술·수학을 융합한 프로젝트 기반 학습으로 창의력을 키웁니다.',
      instructor: {
        name: '정다은',
        title: '카이스트 화학과 3학년',
        bio: '과학올림피아드 수상. 초·중등 STEAM 교육 3년 경력.',
      },
      curriculum: [
        'STEAM 개념 소개 & 실사례',
        '브릿지 설계 챌린지 (모둠)',
        '결과 발표 & 공학적 사고 피드백',
        '나만의 발명 아이디어 스케치',
      ],
      materials: ['A4 용지', '테이프', '가위', '색연필'],
      location: '강남구 청소년수련관 3층 301호',
      qna: [
        { q: '가위를 사용해도 안전한가요?', a: '안전가위를 사용하고, 자르는 활동은 강사가 조별로 함께 진행합니다.' },
        { q: '만든 작품은 가져오나요?', a: '네. 설계 챌린지에서 만든 구조물은 수업 후 가져갑니다. 부피가 커서 쇼핑백을 챙겨 주시면 좋습니다.' },
      ],
      isCancelled: false,
    },
    // ── 6회차 ──────────────────────────────────────────
    {
      id: 'sess-06',
      sessionNumber: 6,
      date: '2026.11.14 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: 'AI/SW 바이브 코딩',
      description:
        'AI 도구를 활용한 창의적 코딩 프로젝트로 미래 디지털 역량을 기릅니다.',
      instructor: {
        name: '한지훈',
        title: '포항공과대학교 컴퓨터공학과 4학년',
        bio: '앱 개발 공모전 대상. 청소년 코딩 캠프 강사 2년.',
      },
      curriculum: [
        'AI란 무엇인가? 생활 속 AI',
        'Scratch / 엔트리로 첫 코딩',
        'AI 이미지 생성 실습',
        '나만의 미니 앱 기획 발표',
      ],
      materials: ['개인 노트북 (없으면 수련관 제공)'],
      location: '강남구 청소년수련관 3층 301호',
      qna: [
        { q: '노트북이 꼭 있어야 하나요?', a: '없으면 수련관 노트북을 빌려 쓸 수 있습니다. 개인 노트북이 있다면 충전기와 함께 보내 주세요.' },
        { q: '아이 계정을 새로 만들어야 하나요?', a: '엔트리는 수업에서 체험용 계정으로 진행합니다. 집에서 이어서 하려면 보호자 동의 후 계정을 만들면 됩니다.' },
      ],
      isCancelled: false,
    },
  ],
};

// ── FAQ (동일 유지) ───────────────────────────────────────

export const DUMMY_FAQS = [
  {
    id: 'faq-01',
    question: '등록코드는 어디서 받나요?',
    answer:
      '자녀가 등록된 캠퍼스의 담당자에게 문의하시면 됩니다. 카카오톡 또는 문자로 발송됩니다.',
  },
  {
    id: 'faq-02',
    question: '앱에 여러 자녀를 등록할 수 있나요?',
    answer:
      '네, 가능합니다. 각 자녀의 등록코드를 순서대로 입력하시면 한 계정에 여러 자녀를 연결할 수 있습니다.',
  },
  {
    id: 'faq-03',
    question: '다른 보호자(아빠, 할머니 등)도 볼 수 있나요?',
    answer:
      '\'내 정보\' 탭의 \'보호자 초대\' 기능으로 다른 보호자 번호를 추가할 수 있습니다. 추가된 번호로 앱을 설치하면 자동으로 연결됩니다.',
  },
  {
    id: 'faq-04',
    question: '수업은 매주 토요일인가요?',
    answer:
      '격주 토요일 오전 10:00~12:00에 진행됩니다. 공휴일이 있는 경우 해당 회차는 휴강되며, 앱 알림으로 미리 안내해 드립니다.',
  },
  {
    id: 'faq-05',
    question: '출결 정보는 언제부터 볼 수 있나요?',
    answer:
      '수업 당일 강사가 출결을 입력하면 앱에 즉시 표시됩니다.',
  },
  {
    id: 'faq-06',
    question: '리포트는 언제 제공되나요?',
    answer:
      '전체 프로그램 종료 후 영업일 기준 3~5일 이내에 리포트가 앱에 업로드됩니다. 알림으로 안내해 드립니다.',
  },
  {
    id: 'faq-07',
    question: '수업 내용이나 일정이 변경되면 어떻게 알 수 있나요?',
    answer:
      '변경 사항 발생 시 앱 내 공지사항과 푸시 알림으로 즉시 안내됩니다.',
  },
  {
    id: 'faq-08',
    question: '수업 장소가 어디인가요?',
    answer:
      '강남구 청소년수련관 3층 301호입니다. 마지막 6회차 이후 수료증은 앱과 캠퍼스에서 함께 안내해 드립니다.',
  },
];
