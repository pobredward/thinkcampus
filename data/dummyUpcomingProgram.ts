/**
 * 더미 "수강 예정" 프로그램 — 겨울방학 특강 (수강 확정, 아직 시작 전)
 * 수강 예정 화면(/main/program/prog-002)은 요약(기간·일시·장소) + 안내 카테고리(목적·회차별 내용·공지·규정·Q&A)로 보여 준다.
 * 나중에 Firestore programs / sessions 컬렉션으로 교체 예정
 *
 * 운영 구조:
 *   매주 토요일 | 1회당 3차시(120분) | 총 6회 | 총 18차시
 *   2026.12.05 ~ 2027.01.16 (2027.01.02 신정 연휴 휴강)
 *   장소: 강남구 청소년수련관 2층 창작실
 */

import type { Program } from './dummyProgram';

const LOCATION = '강남구 청소년수련관 2층 창작실';

const 정다은 = {
  name: '정다은',
  title: '한양대학교 컴퓨터소프트웨어학부 3학년',
  bio: '초등 코딩 교실 2년 운영. 정보올림피아드 입상.',
};

export const DUMMY_UPCOMING_PROGRAM: Program = {
  id: 'prog-002',
  campusId: 'campus-001',
  title: '2026 ThinkCampus 겨울방학 STEAM 특강',
  subtitle: '초등 창의융합 집중 과정',
  category: '방학특강',
  contractCode: '2026-강남-겨울-002',
  startDate: '2026.12.05',
  endDate: '2027.01.16',
  fixedDay: '토',
  frequency: 'weekly',
  startTime: '10:00',
  endTime: '12:00',
  sessionHours: 3,
  totalSessions: 6,
  totalHours: 18,
  location: LOCATION,
  targetGrade: '초등 3~6학년',
  maxStudents: 16,

  status: 'upcoming',
  enrolledAt: '2026.11.20',
  mapQuery: '강남구 청소년수련관',
  directions: [
    { label: '주차', text: '수련관 주차는 2시간 무료예요. 1층 안내데스크에서 차량을 등록해 주세요.' },
    { label: '도착하면', text: '첫 수업은 오리엔테이션을 겸해 9:50까지 2층 창작실로 와 주세요. 이후에도 수업 10분 전까지 교실 앞으로 오시면 돼요.' },
    { label: '데려갈 때', text: '수업이 끝나면 선생님이 1층 로비까지 함께 내려가 보호자께 인계해요.' },
  ],
  host: '강남구청 교육지원과 · 씽크캠퍼스 운영',
  purpose:
    '방학 동안 학원 대신 다양한 분야를 경험해 볼 수 있도록 강남구가 지원하는 방학 특강입니다. 코딩·과학·건축·경제·영어를 한 과정에서 맛보며 진로에 대한 관심을 넓히고, 직접 만들고 발표하는 경험으로 자신감을 키우는 것이 목표입니다.',
  overview:
    '겨울방학 6주 동안 코딩·우주과학·건축·경제·영어 발표를 차례로 경험하는 창의융합 과정입니다. 매 회차 직접 만들고 발표하는 활동 중심으로 진행되며, 마지막 회차에는 학부모님을 모시고 성과 발표회를 엽니다.',
  features: [
    '한 반 16명 이하 소규모 수업',
    '매 회차 만든 결과물을 집에 가져가요',
    '수업이 끝나면 앱에 출결·선생님 피드백이 올라와요',
    '마지막 회차 학부모 참관 발표회 & 수료증',
  ],
  commonMaterials: ['필기도구', '개인 물병', '실내화'],
  notices: [
    '첫 수업은 오리엔테이션을 겸해 9:50까지 2층 창작실로 와 주세요.',
    '수련관 주차는 2시간 무료입니다. (1층 안내데스크에서 차량 등록)',
    '결석·지각할 때는 수업 전날까지 캠퍼스로 연락해 주세요.',
    '1월 2일(토)은 신정 연휴로 휴강하고, 마지막 수업은 1월 16일(토)입니다.',
  ],
  breaks: [{ date: '2027.01.02 (토)', reason: '신정 연휴 휴강' }],
  faq: [
    {
      topic: '준비물',
      q: '태블릿이나 앱을 미리 준비해야 하나요?',
      a: '1회차 코딩 수업은 교실 태블릿을 사용하니 따로 준비하지 않으셔도 돼요. 집에서도 이어서 해 보고 싶다면 무료 앱 ‘ScratchJr’를 설치해 두세요.',
    },
    {
      topic: '모임·픽업',
      q: '마지막 날 발표회는 부모님도 갈 수 있나요?',
      a: '네, 1월 16일(토) 11:00부터 2층 창작실에서 참관하실 수 있어요. 자리 준비를 위해 전날까지 참석 인원을 알려 주세요.',
    },
  ],

  sessions: [
    // ── 1회차 ──────────────────────────────────────────
    {
      id: 'win-01',
      sessionNumber: 1,
      date: '2026.12.05 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '코딩으로 만드는 겨울 이야기',
      description: '블록 코딩으로 눈 내리는 애니메이션과 간단한 게임을 만들어 봅니다. 첫날이라 오리엔테이션도 함께 해요.',
      instructor: 정다은,
      curriculum: [
        '오리엔테이션 & 친구 소개',
        '블록 코딩 기본 — 반복과 조건',
        '눈 내리는 애니메이션 만들기',
        '친구 작품 체험 & 소감 나누기',
      ],
      materials: [],
      location: LOCATION,
      isCancelled: false,
    },
    // ── 2회차 ──────────────────────────────────────────
    {
      id: 'win-02',
      sessionNumber: 2,
      date: '2026.12.12 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '우주 과학 — 겨울 별자리 여행',
      description: '겨울철 별자리와 태양계 행성을 모형과 앱으로 관찰하고, 나만의 별자리 카드를 만듭니다.',
      instructor: {
        name: '한지우',
        title: '서울대학교 지구과학교육과 4학년',
        bio: '천문대 해설 봉사 3년. 과학관 어린이 프로그램 보조강사.',
      },
      curriculum: [
        '겨울 밤하늘 퀴즈',
        '태양계 행성 크기 비교 모형',
        '별자리 앱으로 오리온자리 찾기',
        '나만의 별자리 카드 만들기',
      ],
      materials: ['색연필'],
      location: LOCATION,
      isCancelled: false,
    },
    // ── 3회차 ──────────────────────────────────────────
    {
      id: 'win-03',
      sessionNumber: 3,
      date: '2026.12.19 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '건축 STEAM — 튼튼한 다리 만들기',
      description: '삼각형(트러스) 구조가 튼튼한 이유를 배우고, 팀별로 다리를 만들어 누가 더 무거운 물건을 버티는지 실험합니다.',
      instructor: {
        name: '윤서준',
        title: '연세대학교 건축공학과 4학년',
        bio: '건축 모형 동아리 회장. 초등 STEAM 캠프 강사 경험.',
      },
      curriculum: [
        '세계의 다리 사진으로 구조 찾기',
        '삼각형 구조가 튼튼한 이유',
        '팀별 다리 설계 & 만들기',
        '무게 버티기 실험 & 우승팀 발표',
      ],
      materials: ['앞치마(선택)'],
      location: LOCATION,
      isCancelled: false,
    },
    // ── 4회차 ──────────────────────────────────────────
    {
      id: 'win-04',
      sessionNumber: 4,
      date: '2026.12.26 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '어린이 경제 교실 — 우리 반 시장 놀이',
      description: '용돈 기입장 쓰는 법을 배우고, 가상 화폐로 물건을 사고파는 시장 놀이로 수요와 공급을 체험합니다.',
      instructor: {
        name: '이하린',
        title: '고려대학교 경제학과 3학년',
        bio: '청소년 금융교육 봉사단 활동. 경제 보드게임 수업 진행.',
      },
      curriculum: [
        '돈은 어디서 와서 어디로 갈까?',
        '용돈 기입장 써 보기',
        '우리 반 시장 놀이',
        '오늘 배운 경제 단어 정리',
      ],
      materials: ['계산기(선택)'],
      location: LOCATION,
      isCancelled: false,
    },
    // ── 5회차 (1/2 신정 휴강 후) ─────────────────────────
    {
      id: 'win-05',
      sessionNumber: 5,
      date: '2027.01.09 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '영어 프레젠테이션 — My Winter Project',
      description: '그동안 만든 결과물 중 하나를 골라 영어로 소개하는 짧은 발표문을 쓰고, 짝과 함께 연습합니다.',
      instructor: {
        name: '김지수',
        title: '연세대학교 영어영문학과 4학년',
        bio: '토익 990점, OPIC AL 등급 보유. 3년간 영어 튜터링 경력.',
      },
      curriculum: [
        '발표에 쓰는 영어 표현 익히기',
        '세 문장 발표문 쓰기',
        '짝과 리허설 & 피드백',
        '발표 영상 촬영 (원하는 학생)',
      ],
      materials: ['영어 노트'],
      location: LOCATION,
      isCancelled: false,
    },
    // ── 6회차 ──────────────────────────────────────────
    {
      id: 'win-06',
      sessionNumber: 6,
      date: '2027.01.16 (토)',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      sessionHours: 3,
      topic: '성과 발표회 & 수료식',
      description: '6주 동안 만든 작품을 전시하고 발표합니다. 11:00부터 학부모님도 함께 보실 수 있어요.',
      instructor: 정다은,
      curriculum: [
        '작품 전시 준비',
        '팀별·개인 발표 (11:00부터 학부모 참관)',
        '수료증 수여 & 단체 사진',
        '학부모 상담 (희망자)',
      ],
      materials: ['그동안 만든 작품'],
      location: LOCATION,
      isCancelled: false,
    },
  ],
};
