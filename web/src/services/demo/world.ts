/**
 * 체험판 세계(DemoWorld) — 실서비스 Firestore 와 같은 구조의 한 벌 데이터
 *
 *   - 컬렉션 이름·필드가 docs/DATA_MODEL.md 와 같다 (programRuns · runSessions · students · … )
 *   - 네 역할(학부모·강사·센터·회사)이 같은 세계를 본다: 강사가 출결을 넣으면 센터 대시보드와 학부모 앱에 바로 반영
 *   - 날짜는 "오늘" 기준으로 만든다: 토요 창의융합 4회차 = 오늘, 1~3회차는 지난 격주, 5~6회차는 다음 격주
 *   - 저장: 바꾸는 즉시 sessionStorage 에 남긴다 → 새로고침·화면 이동에도 유지, 탭을 닫으면 사라진다
 *   - 초기화: resetDemoWorld() (배너의 "체험 데이터 초기화")
 *
 * 화면은 이 파일을 직접 쓰지 않는다 — services/demo/*Api.ts 가 읽고 쓴다.
 */

import { DUMMY_PROGRAM, type Program, type Session } from "@/data/dummyProgram";
import { DUMMY_UPCOMING_PROGRAM } from "@/data/dummyUpcomingProgram";
import { DUMMY_ATTENDANCE_MINJUN, DUMMY_ATTENDANCE_SEOYEON } from "@/data/dummyAttendance";
import { DUMMY_REPORT, type StudentReport } from "@/data/dummyReport";
import { dateToKey, keyToDate, todayKey } from "@/lib/dates";
import type { AttendanceStatus, ProgramRunStatus, SessionReportStatus, StaffRole } from "@/services/types";

// ── 컬렉션 타입 (Firestore 문서와 같은 필드) ─────────────────

export interface DemoCampus {
  id: string;
  name: string;
  municipalityName: string;
  address: string;
}

export interface DemoStaff {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  role: StaffRole;
  campusIds: string[];
  /** 강사 소개 (학부모 앱 강사 카드) */
  title?: string;
  bio?: string;
  specialties: string[];
}

export interface DemoTemplateSession {
  id: string;
  order: number;
  topic: string;
  lessonCount: number;
  description: string;
  objectives?: string[];
  teachingMethod?: string;
  curriculum: string[];
  materials: string[];
  lessonPlans?: Session["lessonPlans"];
  planUrl?: string;
  rotationNote?: string;
  qna?: Session["qna"];
  programCode?: string;
}

export interface DemoTemplate {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  targetGrade: string;
  maxStudents: number;
  defaultFrequency: "weekly" | "biweekly";
  defaultFixedDay: number;
  defaultStartTime: string;
  defaultEndTime: string;
  overview?: string;
  purpose?: string;
  features?: string[];
  commonMaterials?: string[];
  faq?: Program["faq"];
  sessions: DemoTemplateSession[];
}

export interface DemoSection {
  id: string;
  label: string;
  sortOrder: number;
}

export interface DemoRun {
  id: string;
  contractCode: string;
  programTemplateId: string;
  title: string;
  campusId: string;
  municipalityName: string;
  status: ProgramRunStatus;
  startDate: string;
  endDate: string;
  frequency: "weekly" | "biweekly";
  fixedDay: number;
  startTime: string;
  endTime: string;
  location: string;
  host?: string;
  mapQuery?: string;
  directions?: Program["directions"];
  notices?: string[];
  breaks?: Program["breaks"];
  sections: DemoSection[];
  reportPolicy: { requireCompanyApproval: boolean };
  createdAt: string;
}

export interface DemoRunSession {
  id: string;
  programRunId: string;
  sessionNumber: number;
  sessionTemplateId: string;
  sectionId: string;
  instructorId: string | null;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  topic: string;
  location: string;
  status: "scheduled" | "cancelled" | "completed";
  cancelReason?: string;
}

export interface DemoStudent {
  id: string;
  name: string;
  birthDate: string; // YYYYMMDD
  campusId: string;
  householdId: string;
  guardianUids: string[];
  photoUrl?: string;
  allowedGuardianPhones: Array<{ phone: string; relation: string }>;
}

export interface DemoEnrollment {
  id: string;
  studentId: string;
  programRunId: string;
  sectionId: string;
  status: "active" | "upcoming" | "completed" | "withdrawn";
  enrolledAt: string;
}

export interface DemoEnrollmentCode {
  code: string;
  studentId: string;
  campusId: string;
  programRunId: string;
  status: "unused" | "used";
}

export interface DemoGuardian {
  uid: string;
  displayName: string | null;
  phone: string;
}

export interface DemoGuardianLink {
  id: string;
  guardianUid: string;
  studentId: string;
  campusId: string;
  guardianRelation: string;
  status: "active";
}

export interface DemoAttendance {
  id: string; // `${runSessionId}__${studentId}`
  runSessionId: string;
  programRunId: string;
  studentId: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  checkinTime?: string;
  recordedByUid: string;
  updatedAt: string;
}

export interface DemoReport {
  id: string; // `${runSessionId}__${studentId}`
  runSessionId: string;
  programRunId: string;
  studentId: string;
  instructorId: string | null;
  status: SessionReportStatus;
  participationScore: number | null;
  homeworkDone: boolean | null;
  feedback: string;
  highlights: string[];
  improvements: string[];
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
  returnNote?: string;
  updatedAt: string;
}

export interface DemoNotification {
  id: string;
  type: "notice" | "attendance" | "report" | "schedule";
  title: string;
  body: string;
  programRunId?: string;
  sectionId?: string;
  /** 특정 학생의 보호자에게만 (출결·리포트 알림) */
  studentId?: string;
  createdAt: string;
  createdByUid: string;
  recipients: number;
  readBy: string[];
}

export interface DemoFinalReport extends StudentReport {
  programRunId: string;
}

export interface DemoWorld {
  version: number;
  seededFor: string; // 오늘(YYYY-MM-DD) — 날이 바뀌면 다시 만든다
  campuses: DemoCampus[];
  staff: DemoStaff[];
  templates: DemoTemplate[];
  runs: DemoRun[];
  runSessions: DemoRunSession[];
  students: DemoStudent[];
  enrollments: DemoEnrollment[];
  enrollmentCodes: DemoEnrollmentCode[];
  guardians: DemoGuardian[];
  guardianLinks: DemoGuardianLink[];
  attendance: DemoAttendance[];
  reports: DemoReport[];
  notifications: DemoNotification[];
  finalReports: DemoFinalReport[];
  imports: Array<{ at: string; rowCount: number; contractCode: string }>;
}

// ── 체험 계정 (역할별 로그인 사용자) ─────────────────────────

export const DEMO_CAMPUS_ID = "campus-ds26";
export const DEMO_RUN_A_ID = "run-ds26-creative";
export const DEMO_RUN_B_ID = "run-ds26-winter";
export const DEMO_RUN_C_ID = "run-gumi-steam";

export const DEMO_GUARDIAN_UID = "demo-guardian-01076567933";
export const DEMO_GUARDIAN_PHONE_E164 = "+821076567933";
export const DEMO_GUARDIAN_NAME = "신선웅";

export const DEMO_STAFF = {
  company: { uid: "demo-staff-company", displayName: "김도현", email: "admin@demo.thinkcampus.kr" },
  center: { uid: "demo-staff-center", displayName: "이정민", email: "center@demo.thinkcampus.kr" },
  instructor: { uid: "demo-instructor-park", displayName: "박지훈", email: "teacher@demo.thinkcampus.kr" },
} as const;

// ── 결정적 난수 (같은 날이면 항상 같은 세계) ─────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function addDays(key: string, days: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return dateToKey(d);
}

function isoAt(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00+09:00`;
}

// ── 시드 ────────────────────────────────────────────────

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const GIVEN = [
  "서준", "하은", "도윤", "지우", "시우", "서윤", "예준", "하린", "주원", "지민", "지호", "수아", "준서", "채원", "유준", "지아",
  "건우", "다은", "현우", "은서", "우진", "소율", "선우", "예린", "연우", "시은", "민재", "유나", "정우", "가은", "승현", "윤서",
  "재윤", "나은", "지환", "서현", "은우", "하율", "태윤", "지윤",
];

function templateFromProgram(id: string, p: Program, category: string): DemoTemplate {
  return {
    id,
    title: p.title.replace(/^2026 ThinkCampus /, ""),
    subtitle: p.subtitle,
    category,
    targetGrade: p.targetGrade,
    maxStudents: p.maxStudents,
    defaultFrequency: p.frequency,
    defaultFixedDay: 6,
    defaultStartTime: p.startTime,
    defaultEndTime: p.endTime,
    overview: p.overview,
    purpose: p.purpose,
    features: p.features,
    commonMaterials: p.commonMaterials,
    faq: p.faq,
    sessions: p.sessions.map((s) => ({
      id: `${id}-s${pad2(s.sessionNumber)}`,
      order: s.sessionNumber,
      topic: s.topic,
      lessonCount: s.sessionHours,
      description: s.description,
      objectives: s.objectives,
      teachingMethod: s.teachingMethod,
      curriculum: s.curriculum,
      materials: s.materials,
      lessonPlans: s.lessonPlans,
      planUrl: s.planUrl,
      rotationNote: s.rotationNote,
      qna: s.qna,
      programCode: s.programCode,
    })),
  };
}

/** 회차 리포트 피드백 문구 — 회차 주제별로 몇 가지씩 돌려 쓴다 */
const FEEDBACK_POOL: Array<{ feedback: string; highlights: string[]; improvements: string[] }> = [
  {
    feedback: "수업 내용을 잘 따라오고, 모둠 활동에서 친구들 의견을 잘 들어 주었어요.",
    highlights: ["모둠 토론에서 역할을 스스로 맡음", "활동지를 끝까지 꼼꼼하게 작성"],
    improvements: ["발표할 때 목소리를 조금 더 크게 내 보면 좋겠어요"],
  },
  {
    feedback: "질문이 많고 호기심이 강해요. 오늘 배운 개념을 스스로 예를 들어 설명했어요.",
    highlights: ["새로운 개념을 자기 말로 다시 설명함", "친구의 질문에 먼저 대답해 줌"],
    improvements: ["활동 시간 안에 마무리하는 연습이 필요해요"],
  },
  {
    feedback: "차분하게 집중해서 참여했고, 정리 퀴즈에서 좋은 결과를 냈어요.",
    highlights: ["핵심 개념 정리 퀴즈 전 문항 정답", "수업 태도가 안정적"],
    improvements: ["모둠 활동에서 의견을 조금 더 자주 내 보세요"],
  },
  {
    feedback: "발표를 자신 있게 했어요. 아이디어가 독창적이라 친구들이 많이 호응했어요.",
    highlights: ["개인 발표에서 독창적인 아이디어 제시", "친구 발표에 좋은 질문을 함"],
    improvements: ["근거를 한 가지 더 덧붙이면 설득력이 커져요"],
  },
  {
    feedback: "처음에는 조용했지만 후반부 활동에서 적극적으로 참여했어요.",
    highlights: ["짝 활동에서 친구를 도와 줌", "활동지 그림 표현이 인상적"],
    improvements: ["수업 초반부터 참여해 보도록 격려해 주세요"],
  },
];

export function buildDemoWorld(today = todayKey()): DemoWorld {
  const rnd = mulberry32(20260916);
  const todayDate = keyToDate(today);
  const weekday = todayDate.getDay();
  const now = new Date();

  // ── 캠퍼스 · 직원 ──
  const campuses: DemoCampus[] = [
    { id: DEMO_CAMPUS_ID, name: "달성캠퍼스", municipalityName: "달성군", address: "대구 달성군 청소년수련관 3층" },
    { id: "campus-gm26", name: "구미캠퍼스", municipalityName: "구미시", address: "경북 구미시 청소년문화센터 2층" },
  ];

  const staff: DemoStaff[] = [
    {
      uid: DEMO_STAFF.company.uid,
      displayName: DEMO_STAFF.company.displayName,
      email: DEMO_STAFF.company.email,
      role: "companyAdmin",
      campusIds: [],
      specialties: [],
    },
    {
      uid: DEMO_STAFF.center.uid,
      displayName: DEMO_STAFF.center.displayName,
      email: DEMO_STAFF.center.email,
      phone: "",
      role: "centerAdmin",
      campusIds: [DEMO_CAMPUS_ID],
      specialties: [],
    },
    {
      uid: "demo-staff-center-gumi",
      displayName: "정수빈",
      email: "gumi@demo.thinkcampus.kr",
      role: "centerAdmin",
      campusIds: ["campus-gm26"],
      specialties: [],
    },
    {
      uid: DEMO_STAFF.instructor.uid,
      displayName: DEMO_STAFF.instructor.displayName,
      email: DEMO_STAFF.instructor.email,
      role: "instructor",
      campusIds: [DEMO_CAMPUS_ID],
      title: "연세대학교 교육학과 4학년",
      bio: "전국 고교 토론대회 우승. 초등 인문·토론 멘토 3년.",
      specialties: ["인문학", "토론"],
    },
    {
      uid: "demo-instructor-lee",
      displayName: "이수민",
      email: "lee@demo.thinkcampus.kr",
      role: "instructor",
      campusIds: [DEMO_CAMPUS_ID],
      title: "서울대학교 과학교육과 3학년",
      bio: "과학올림피아드 수상. 초·중등 STEAM 교육 2년.",
      specialties: ["과학", "STEAM"],
    },
    {
      uid: "demo-instructor-choi",
      displayName: "최현우",
      email: "choi@demo.thinkcampus.kr",
      role: "instructor",
      campusIds: [DEMO_CAMPUS_ID],
      title: "고려대학교 영어교육과 4학년",
      bio: "토익 990점, OPIC AL. 영어 발표·코딩 캠프 강사 2년.",
      specialties: ["영어", "코딩"],
    },
    {
      uid: "demo-instructor-kim",
      displayName: "김하늘",
      email: "kim@demo.thinkcampus.kr",
      role: "instructor",
      campusIds: ["campus-gm26"],
      title: "경북대학교 물리교육과 4학년",
      bio: "과학관 어린이 프로그램 보조강사 2년.",
      specialties: ["과학"],
    },
    {
      uid: "demo-instructor-jung",
      displayName: "정우진",
      email: "jung@demo.thinkcampus.kr",
      role: "instructor",
      campusIds: ["campus-gm26"],
      title: "금오공과대학교 컴퓨터공학과 3학년",
      bio: "초등 코딩 교실 2년 운영.",
      specialties: ["코딩", "STEAM"],
    },
  ];

  // ── 프로그램 템플릿 ──
  const tplCreative = templateFromProgram("tpl-creative", DUMMY_PROGRAM, "특기적성");
  const tplSteam = templateFromProgram("tpl-steam", DUMMY_UPCOMING_PROGRAM, "방학특강");
  const tplSummer: DemoTemplate = {
    id: "tpl-summer",
    title: "여름학기 수학·과학 집중 캠프",
    subtitle: "수학·과학 집중 캠프",
    category: "방학특강",
    targetGrade: "초등 3~6학년",
    maxStudents: 20,
    defaultFrequency: "weekly",
    defaultFixedDay: 6,
    defaultStartTime: "10:00",
    defaultEndTime: "12:00",
    sessions: ["도형과 공간 감각", "수의 규칙 찾기", "빛과 그림자 실험", "물의 힘 — 부력 탐구", "확률 게임", "발표회 & 수료식"].map(
      (topic, i) => ({
        id: `tpl-summer-s${pad2(i + 1)}`,
        order: i + 1,
        topic,
        lessonCount: 2,
        description: `${topic}을(를) 직접 실험하고 발표하는 활동 중심 수업이에요.`,
        curriculum: ["도입 활동", "모둠 실험", "결과 발표"],
        materials: ["필기도구"],
      }),
    ),
  };
  const tplEnglish: DemoTemplate = {
    id: "tpl-english",
    title: "영어 스피킹 특강",
    subtitle: "원어민 회화 집중 과정",
    category: "특기적성",
    targetGrade: "초등 4~6학년",
    maxStudents: 12,
    defaultFrequency: "weekly",
    defaultFixedDay: 6,
    defaultStartTime: "10:00",
    defaultEndTime: "12:00",
    sessions: ["자기소개와 인사", "우리 동네 소개하기", "좋아하는 것 말하기", "미니 발표회"].map((topic, i) => ({
      id: `tpl-english-s${pad2(i + 1)}`,
      order: i + 1,
      topic,
      lessonCount: 2,
      description: `${topic} — 짝 활동과 짧은 발표로 말하기 자신감을 키워요.`,
      curriculum: ["표현 익히기", "짝 활동", "발표"],
      materials: ["영어 노트"],
    })),
  };
  const templates = [tplCreative, tplSteam, tplSummer, tplEnglish];

  // ── 운영 건 ──
  const sectionsOf = (n: number): DemoSection[] =>
    Array.from({ length: n }, (_, i) => ({ id: `sec-${i + 1}`, label: `${i + 1}반`, sortOrder: i + 1 }));

  // A: 토요 창의융합 — 4회차 = 오늘, 격주, 1~3반 10:00 · 4~6반 13:00
  const aDates = [1, 2, 3, 4, 5, 6].map((n) => addDays(today, 14 * (n - 4)));
  const runA: DemoRun = {
    id: DEMO_RUN_A_ID,
    contractCode: "2026-달성-창의-01",
    programTemplateId: tplCreative.id,
    title: "2026 ThinkCampus 토요 창의융합",
    campusId: DEMO_CAMPUS_ID,
    municipalityName: "달성군",
    status: "active",
    startDate: aDates[0],
    endDate: aDates[5],
    frequency: "biweekly",
    fixedDay: weekday,
    startTime: "10:00",
    endTime: "15:00",
    location: "달성군 청소년수련관 3층 301호",
    host: "달성군청 교육지원과 · 씽크캠퍼스 운영",
    mapQuery: "달성군 청소년수련관",
    directions: [
      { label: "주차", text: "수련관 주차는 2시간 무료예요. 1층 안내데스크에서 차량을 등록해 주세요." },
      { label: "도착하면", text: "수업 10분 전까지 3층 301호 교실 앞으로 와 주세요. 선생님이 출석을 확인하고 맞이해요." },
      { label: "데려갈 때", text: "수업이 끝나면 선생님이 1층 로비까지 함께 내려가 보호자께 인계해요." },
    ],
    notices: [
      "수업 10분 전까지 3층 301호로 와 주세요.",
      "수련관 주차는 2시간 무료입니다. (1층 안내데스크에서 차량 등록)",
      "결석·지각할 때는 수업 전날까지 캠퍼스로 연락해 주세요.",
      "마지막 수업이 끝나면 종합 리포트가 발급돼요.",
    ],
    sections: sectionsOf(6),
    reportPolicy: { requireCompanyApproval: false },
    createdAt: isoAt(addDays(aDates[0], -21), "10:00"),
  };

  // B: 겨울방학 STEAM 특강 — 9주 뒤 시작, 매주, 1반
  const bStart = addDays(today, 63);
  const runB: DemoRun = {
    id: DEMO_RUN_B_ID,
    contractCode: "2026-달성-겨울-02",
    programTemplateId: tplSteam.id,
    title: "2026 ThinkCampus 겨울방학 STEAM 특강",
    campusId: DEMO_CAMPUS_ID,
    municipalityName: "달성군",
    status: "scheduled",
    startDate: bStart,
    endDate: addDays(bStart, 7 * 5),
    frequency: "weekly",
    fixedDay: weekday,
    startTime: "10:00",
    endTime: "12:00",
    location: "달성군 청소년수련관 2층 창작실",
    host: "달성군청 교육지원과 · 씽크캠퍼스 운영",
    mapQuery: "달성군 청소년수련관",
    directions: DUMMY_UPCOMING_PROGRAM.directions,
    notices: [
      "첫 수업은 오리엔테이션을 겸해 9:50까지 2층 창작실로 와 주세요.",
      "수련관 주차는 2시간 무료입니다. (1층 안내데스크에서 차량 등록)",
      "결석·지각할 때는 수업 전날까지 캠퍼스로 연락해 주세요.",
    ],
    sections: sectionsOf(1),
    reportPolicy: { requireCompanyApproval: false },
    createdAt: isoAt(addDays(today, -3), "14:00"),
  };

  // C: 구미 STEAM — 3주 전 시작, 매주, 2반 (회사 화면에서만 보인다 · 회사 승인 정책)
  const cStart = addDays(today, -21);
  const runC: DemoRun = {
    id: DEMO_RUN_C_ID,
    contractCode: "2026-구미-STEAM-01",
    programTemplateId: tplSteam.id,
    title: "2026 ThinkCampus 구미 STEAM 탐구",
    campusId: "campus-gm26",
    municipalityName: "구미시",
    status: "active",
    startDate: cStart,
    endDate: addDays(cStart, 7 * 5),
    frequency: "weekly",
    fixedDay: weekday,
    startTime: "14:00",
    endTime: "16:00",
    location: "구미시 청소년문화센터 2층 과학실",
    host: "구미시청 교육지원과 · 씽크캠퍼스 운영",
    sections: sectionsOf(2),
    reportPolicy: { requireCompanyApproval: true },
    createdAt: isoAt(addDays(cStart, -30), "10:00"),
  };

  // 지난 수강 (학부모 앱 "이전 수강 이력")
  const runP1: DemoRun = {
    id: "run-ds26-summer",
    contractCode: "2026-달성-여름-01",
    programTemplateId: tplSummer.id,
    title: "2026 ThinkCampus 여름학기",
    campusId: DEMO_CAMPUS_ID,
    municipalityName: "달성군",
    status: "completed",
    startDate: "2026-07-20",
    endDate: "2026-08-24",
    frequency: "weekly",
    fixedDay: 1,
    startTime: "10:00",
    endTime: "12:00",
    location: "달성군 청소년수련관 3층 301호",
    sections: sectionsOf(1),
    reportPolicy: { requireCompanyApproval: false },
    createdAt: "2026-06-20T10:00:00+09:00",
  };
  const runP2: DemoRun = {
    id: "run-ds26-english",
    contractCode: "2026-달성-영어-01",
    programTemplateId: tplEnglish.id,
    title: "2026 영어 스피킹 특강",
    campusId: DEMO_CAMPUS_ID,
    municipalityName: "달성군",
    status: "completed",
    startDate: "2026-05-02",
    endDate: "2026-05-23",
    frequency: "weekly",
    fixedDay: 6,
    startTime: "10:00",
    endTime: "12:00",
    location: "달성군 청소년수련관 3층 302호",
    sections: sectionsOf(1),
    reportPolicy: { requireCompanyApproval: false },
    createdAt: "2026-04-10T10:00:00+09:00",
  };
  const runs = [runA, runB, runC, runP1, runP2];

  // ── 회차 (날짜 × 반) ──
  const runSessions: DemoRunSession[] = [];
  const slotOf = (run: DemoRun, section: DemoSection): { start: string; end: string } => {
    if (run.id === DEMO_RUN_A_ID) return section.sortOrder <= 3 ? { start: "10:00", end: "12:00" } : { start: "13:00", end: "15:00" };
    return { start: run.startTime, end: run.endTime };
  };
  const instructorFor = (run: DemoRun, section: DemoSection, sessionNumber: number): string | null => {
    if (run.id === DEMO_RUN_A_ID) {
      if (sessionNumber === 5 && section.sortOrder === 6) return null; // 배정 화면 체험용 (미배정 1건)
      const map = ["demo-instructor-park", "demo-instructor-lee", "demo-instructor-choi"];
      return map[(section.sortOrder - 1) % 3];
    }
    if (run.id === DEMO_RUN_C_ID) return section.sortOrder === 1 ? "demo-instructor-kim" : "demo-instructor-jung";
    if (run.id === DEMO_RUN_B_ID) return sessionNumber <= 2 ? "demo-instructor-lee" : null;
    if (run.id === runP1.id) return "demo-instructor-lee";
    if (run.id === runP2.id) return "demo-instructor-choi";
    return null;
  };
  const datesOf = (run: DemoRun, count: number): string[] => {
    if (run.id === DEMO_RUN_A_ID) return aDates;
    const step = run.frequency === "biweekly" ? 14 : 7;
    return Array.from({ length: count }, (_, i) => addDays(run.startDate, step * i));
  };
  for (const run of runs) {
    const tpl = templates.find((t) => t.id === run.programTemplateId)!;
    const dates = datesOf(run, tpl.sessions.length);
    for (const ts of tpl.sessions) {
      const date = dates[ts.order - 1];
      for (const section of run.sections) {
        const slot = slotOf(run, section);
        const past = date < today;
        runSessions.push({
          id: `rs-${run.id.replace(/^run-/, "")}-${pad2(ts.order)}-${section.id}`,
          programRunId: run.id,
          sessionNumber: ts.order,
          sessionTemplateId: ts.id,
          sectionId: section.id,
          instructorId: instructorFor(run, section, ts.order),
          scheduledDate: date,
          startTime: slot.start,
          endTime: slot.end,
          lessonCount: ts.lessonCount,
          topic: ts.topic,
          location: run.location,
          status: past ? "completed" : "scheduled",
        });
      }
    }
  }

  // ── 학생 · 가구 · 보호자 · 수강 ──
  const students: DemoStudent[] = [];
  const enrollments: DemoEnrollment[] = [];
  const enrollmentCodes: DemoEnrollmentCode[] = [];
  const guardians: DemoGuardian[] = [
    { uid: DEMO_GUARDIAN_UID, displayName: DEMO_GUARDIAN_NAME, phone: DEMO_GUARDIAN_PHONE_E164 },
  ];
  const guardianLinks: DemoGuardianLink[] = [];
  const usedNames = new Set<string>();
  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const newCode = (campusId: string) => {
    const prefix = campusId === DEMO_CAMPUS_ID ? "DS26" : "GM26";
    let suffix = "";
    for (let i = 0; i < 5; i++) suffix += CODE_ALPHABET[Math.floor(rnd() * CODE_ALPHABET.length)];
    return `${prefix}-${suffix}`;
  };

  const addStudent = (
    id: string,
    name: string,
    campusId: string,
    householdId: string,
    birthYear: number,
  ): DemoStudent => {
    const bm = 1 + Math.floor(rnd() * 12);
    const bd = 1 + Math.floor(rnd() * 28);
    const s: DemoStudent = {
      id,
      name,
      birthDate: `${birthYear}${pad2(bm)}${pad2(bd)}`,
      campusId,
      householdId,
      guardianUids: [],
      allowedGuardianPhones: [],
    };
    students.push(s);
    return s;
  };
  const enroll = (s: DemoStudent, run: DemoRun, sectionId: string, status: DemoEnrollment["status"], codeStatus: "unused" | "used") => {
    enrollments.push({
      id: `enr-${run.id.replace(/^run-/, "")}-${s.id}`,
      studentId: s.id,
      programRunId: run.id,
      sectionId,
      status,
      enrolledAt: run.createdAt,
    });
    enrollmentCodes.push({ code: newCode(run.campusId), studentId: s.id, campusId: run.campusId, programRunId: run.id, status: codeStatus });
  };
  const linkGuardian = (s: DemoStudent, uid: string, relation: string) => {
    if (!s.guardianUids.includes(uid)) s.guardianUids.push(uid);
    guardianLinks.push({
      id: `gl-${uid}-${s.id}`,
      guardianUid: uid,
      studentId: s.id,
      campusId: s.campusId,
      guardianRelation: relation,
      status: "active",
    });
  };
  const pickName = (surname?: string) => {
    for (let tries = 0; tries < 50; tries++) {
      const sn = surname ?? SURNAMES[Math.floor(rnd() * SURNAMES.length)];
      const gn = GIVEN[Math.floor(rnd() * GIVEN.length)];
      const name = sn + gn;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
    return `${surname ?? "김"}하늘${usedNames.size}`;
  };

  // 체험 보호자의 두 자녀: 신민준 1반(10:00) · 신서연 4반(13:00)
  usedNames.add("신민준");
  usedNames.add("신서연");
  const minjun = addStudent("student-001", "신민준", DEMO_CAMPUS_ID, "hh-shin", 2015);
  const seoyeon = addStudent("student-002", "신서연", DEMO_CAMPUS_ID, "hh-shin", 2017);
  enroll(minjun, runA, "sec-1", "active", "used");
  enroll(seoyeon, runA, "sec-4", "active", "used");
  enroll(minjun, runB, "sec-1", "upcoming", "used");
  enroll(minjun, runP1, "sec-1", "completed", "used");
  enroll(seoyeon, runP1, "sec-1", "completed", "used");
  enroll(minjun, runP2, "sec-1", "completed", "used");
  linkGuardian(minjun, DEMO_GUARDIAN_UID, "부");
  linkGuardian(seoyeon, DEMO_GUARDIAN_UID, "부");

  // 나머지 70명 — 6반 × 12명, 형제 가구 8곳, 보호자 연결 약 85%
  let seq = 2;
  let guardianSeq = 0;
  const siblingPairs: Array<[DemoStudent, DemoStudent]> = [];
  for (const section of runA.sections) {
    const already = section.id === "sec-1" || section.id === "sec-4" ? 1 : 0;
    for (let i = already; i < 12; i++) {
      seq++;
      const id = `student-${String(seq).padStart(3, "0")}`;
      const s = addStudent(id, pickName(), DEMO_CAMPUS_ID, `hh-${id}`, 2014 + Math.floor(rnd() * 4));
      enroll(s, runA, section.id, "active", rnd() < 0.85 ? "used" : "unused");
    }
  }
  // 형제: 같은 성 + 같은 가구로 묶는다 (반은 다르게)
  const others = students.filter((s) => s.id !== minjun.id && s.id !== seoyeon.id);
  for (let k = 0; k < 8; k++) {
    const a = others[k * 8];
    const b = others[k * 8 + 5];
    if (!a || !b) break;
    const surname = a.name[0];
    b.name = pickName(surname);
    b.householdId = a.householdId;
    siblingPairs.push([a, b]);
  }
  for (const s of others) {
    const code = enrollmentCodes.find((c) => c.studentId === s.id && c.programRunId === runA.id);
    if (code?.status !== "used") continue;
    const sibling = siblingPairs.find(([a, b]) => a.id === s.id || b.id === s.id);
    const existingUid = sibling
      ? guardianLinks.find((l) => l.studentId === (sibling[0].id === s.id ? sibling[1].id : sibling[0].id))?.guardianUid
      : undefined;
    const uid = existingUid ?? `g-${String(++guardianSeq).padStart(3, "0")}`;
    if (!existingUid) {
      guardians.push({ uid, displayName: null, phone: `+82100000${String(guardianSeq).padStart(4, "0")}` });
    }
    linkGuardian(s, uid, rnd() < 0.6 ? "모" : "부");
    if (rnd() < 0.25) {
      const uid2 = `g-${String(++guardianSeq).padStart(3, "0")}`;
      guardians.push({ uid: uid2, displayName: null, phone: `+82100000${String(guardianSeq).padStart(4, "0")}` });
      linkGuardian(s, uid2, "조모");
    }
  }

  // 구미 40명 (2반 × 20) — 회사 화면 집계용
  for (const section of runC.sections) {
    for (let i = 0; i < 20; i++) {
      seq++;
      const id = `student-${String(seq).padStart(3, "0")}`;
      const s = addStudent(id, pickName(), "campus-gm26", `hh-${id}`, 2014 + Math.floor(rnd() * 4));
      enroll(s, runC, section.id, "active", rnd() < 0.8 ? "used" : "unused");
      if (rnd() < 0.8) {
        const uid = `g-${String(++guardianSeq).padStart(3, "0")}`;
        guardians.push({ uid, displayName: null, phone: `+82100000${String(guardianSeq).padStart(4, "0")}` });
        linkGuardian(s, uid, "모");
      }
    }
  }

  // ── 출결 · 회차 리포트 ──
  const attendance: DemoAttendance[] = [];
  const reports: DemoReport[] = [];
  const dummyRecordsFor = (studentId: string) =>
    studentId === minjun.id ? DUMMY_ATTENDANCE_MINJUN.sessions : studentId === seoyeon.id ? DUMMY_ATTENDANCE_SEOYEON.sessions : null;

  /** 반별 3회차 리포트 상태: 1반 공개 · 2반 검수 대기 · 3반 공개 · 4반 작성 중 · 5반 검수 대기 · 6반 공개 */
  const session3Status: Record<string, SessionReportStatus> = {
    "sec-1": "published",
    "sec-2": "submitted",
    "sec-3": "published",
    "sec-4": "draft",
    "sec-5": "submitted",
    "sec-6": "published",
  };

  const nowHm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  for (const rs of runSessions) {
    const run = runs.find((r) => r.id === rs.programRunId)!;
    if (run.status === "scheduled") continue;
    const isToday = rs.scheduledDate === today;
    const past = rs.scheduledDate < today;
    // 오늘: 오전 반(10:00)은 입력 완료, 오후 반은 아직
    const morningToday = isToday && rs.startTime === "10:00" && run.id === DEMO_RUN_A_ID;
    if (!past && !morningToday) continue;

    const enrolled = enrollments.filter((e) => e.programRunId === rs.programRunId && e.sectionId === rs.sectionId);
    for (const e of enrolled) {
      const dummy = dummyRecordsFor(e.studentId)?.find((d) => d.sessionNumber === rs.sessionNumber && run.id === DEMO_RUN_A_ID);
      const roll = rnd();
      let status: AttendanceStatus = roll < 0.86 ? "present" : roll < 0.94 ? "late" : "absent";
      let lateMinutes: number | undefined;
      if (dummy && dummy.status !== "upcoming") {
        status = dummy.status;
        lateMinutes = dummy.lateMinutes;
      } else if (status === "late") {
        lateMinutes = 5 + Math.floor(rnd() * 20);
      }
      const startH = Number(rs.startTime.slice(0, 2));
      const startM = Number(rs.startTime.slice(3));
      const minutesToHm = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
      const checkin =
        status === "absent"
          ? undefined
          : status === "late"
            ? minutesToHm(startH * 60 + startM + (lateMinutes ?? 10))
            : minutesToHm(startH * 60 + startM - 2 - Math.floor(rnd() * 10));
      const recordedAt = morningToday ? isoAt(today, nowHm < "12:05" ? nowHm : "12:05") : isoAt(rs.scheduledDate, rs.endTime);
      attendance.push({
        id: `${rs.id}__${e.studentId}`,
        runSessionId: rs.id,
        programRunId: rs.programRunId,
        studentId: e.studentId,
        status,
        lateMinutes,
        checkinTime: checkin,
        recordedByUid: rs.instructorId ?? DEMO_STAFF.center.uid,
        updatedAt: recordedAt,
      });

      // 리포트 — 결석은 피드백 없이 공개(출결만)
      let rStatus: SessionReportStatus = "published";
      if (run.id === DEMO_RUN_A_ID && rs.sessionNumber === 3) rStatus = session3Status[rs.sectionId] ?? "published";
      if (morningToday) rStatus = "draft";
      if (run.id === DEMO_RUN_C_ID) {
        // 회사 승인 정책: 최근 회차는 승인 대기
        const cSessions = runSessions.filter((x) => x.programRunId === DEMO_RUN_C_ID && x.scheduledDate < today).map((x) => x.sessionNumber);
        const last = Math.max(...cSessions);
        rStatus = rs.sessionNumber === last ? "reviewed" : "published";
      }
      const pool = FEEDBACK_POOL[Math.floor(rnd() * FEEDBACK_POOL.length)];
      const partialDraft = morningToday && rnd() < 0.6; // 오늘 오전 반: 일부만 작성해 둔 상태
      const written = rStatus !== "draft" || partialDraft;
      const base = dummy && dummy.status !== "upcoming" && dummy.feedback ? dummy : null;
      const score = status === "absent" ? null : base ? base.participationScore : 55 + Math.floor(rnd() * 45);
      reports.push({
        id: `${rs.id}__${e.studentId}`,
        runSessionId: rs.id,
        programRunId: rs.programRunId,
        studentId: e.studentId,
        instructorId: rs.instructorId,
        status: rStatus,
        participationScore: written ? score : null,
        homeworkDone: written && status !== "absent" ? (base ? base.homeworkDone : rnd() < 0.8) : null,
        feedback: written && status !== "absent" ? (base ? (base.feedback ?? "") : pool.feedback) : "",
        highlights: written && status !== "absent" ? (base ? base.highlights : pool.highlights) : [],
        improvements: written && status !== "absent" ? (base ? base.improvements : pool.improvements) : [],
        submittedAt: rStatus === "draft" ? undefined : isoAt(rs.scheduledDate, "18:00"),
        reviewedAt: rStatus === "reviewed" || rStatus === "published" ? isoAt(rs.scheduledDate, "20:00") : undefined,
        publishedAt: rStatus === "published" ? isoAt(rs.scheduledDate, "20:30") : undefined,
        updatedAt: recordedAt,
      });
    }
  }

  // ── 알림 (학부모 앱) ──
  const notifications: DemoNotification[] = [];
  let nSeq = 0;
  const notify = (n: Omit<DemoNotification, "id" | "readBy" | "recipients"> & { recipients?: number; read?: boolean }) => {
    notifications.push({
      ...n,
      id: `ntf-${String(++nSeq).padStart(3, "0")}`,
      recipients: n.recipients ?? 0,
      readBy: n.read ? [DEMO_GUARDIAN_UID] : [],
    });
  };
  const linkedGuardiansA = new Set(guardianLinks.filter((l) => students.find((s) => s.id === l.studentId)?.campusId === DEMO_CAMPUS_ID).map((l) => l.guardianUid)).size;
  notify({
    type: "notice",
    title: "4회차 디베이트 주제 안내",
    body: "오늘 수업 주제는 ‘인공지능 vs 인간’이에요. 아이와 찬성·반대 의견을 한 번씩 이야기해 보세요.",
    programRunId: runA.id,
    createdAt: isoAt(addDays(today, -3), "17:00"),
    createdByUid: DEMO_STAFF.center.uid,
    recipients: linkedGuardiansA,
    read: true,
  });
  notify({
    type: "attendance",
    title: "신민준 출석 확인",
    body: "오늘 10:00 수업에 출석했어요.",
    programRunId: runA.id,
    studentId: minjun.id,
    createdAt: isoAt(today, "10:05"),
    createdByUid: "demo-instructor-park",
  });
  notify({
    type: "report",
    title: "신민준 3회차 리포트 도착",
    body: "‘한국사 인문학’ 수업의 선생님 피드백이 올라왔어요.",
    programRunId: runA.id,
    studentId: minjun.id,
    createdAt: isoAt(aDates[2], "20:30"),
    createdByUid: DEMO_STAFF.center.uid,
    read: true,
  });
  notify({
    type: "schedule",
    title: "겨울방학 STEAM 특강 수강 확정",
    body: `신민준 학생의 겨울방학 STEAM 특강 수강이 확정됐어요. 첫 수업은 ${bStart.slice(5).replace("-", "월 ")}일이에요.`,
    programRunId: runB.id,
    studentId: minjun.id,
    createdAt: isoAt(addDays(today, -2), "11:00"),
    createdByUid: DEMO_STAFF.center.uid,
    read: true,
  });
  notify({
    type: "notice",
    title: "주차 안내",
    body: "수련관 주차장 공사로 이번 주는 후문 임시 주차장을 이용해 주세요.",
    programRunId: runA.id,
    createdAt: isoAt(addDays(today, -8), "09:00"),
    createdByUid: DEMO_STAFF.center.uid,
    recipients: linkedGuardiansA,
    read: true,
  });

  // ── 종합 리포트 (지난 프로그램) ──
  const finalReports: DemoFinalReport[] = [
    {
      ...DUMMY_REPORT,
      programRunId: runP1.id,
      reportId: "final-summer-student-001",
      studentId: minjun.id,
      studentName: minjun.name,
      campusName: "달성캠퍼스",
      campPeriod: "2026.07.20 – 2026.08.24",
      issueDate: "2026.08.28",
      overallComment: DUMMY_REPORT.overallComment,
    },
    {
      ...DUMMY_REPORT,
      programRunId: runP1.id,
      reportId: "final-summer-student-002",
      studentId: seoyeon.id,
      studentName: seoyeon.name,
      campusName: "달성캠퍼스",
      campPeriod: "2026.07.20 – 2026.08.24",
      issueDate: "2026.08.28",
      totalScore: 78,
      totalGrade: "A",
      personalityType: "표현형 창의인재 (PRESENTER)",
      personalityDesc: "생각을 말과 그림으로 표현하는 것을 즐기고, 친구들 앞에서 발표하는 데 거리낌이 없습니다. 새로운 활동에 먼저 손을 드는 적극성이 돋보입니다.",
      overallComment: "서연이는 여름학기 내내 밝은 에너지로 모둠을 이끌었습니다. 실험 결과를 정리해 발표하는 활동에서 특히 두각을 보였고, 수 규칙 찾기에서는 끈기 있게 여러 방법을 시도했습니다.",
      strengthAreas: ["발표·표현력", "모둠 협력"],
      growthAreas: ["차분한 문제 풀이", "기록 습관"],
      programs: DUMMY_REPORT.programs.map((p, i) => ({ ...p, overallScore: Math.max(60, p.overallScore - 6 + (i % 3)), grade: "A" as const })),
    },
  ];

  return {
    version: 1,
    seededFor: today,
    campuses,
    staff,
    templates,
    runs,
    runSessions,
    students,
    enrollments,
    enrollmentCodes,
    guardians,
    guardianLinks,
    attendance,
    reports,
    notifications,
    finalReports,
    imports: [{ at: isoAt(addDays(aDates[0], -14), "15:20"), rowCount: 72, contractCode: runA.contractCode }],
  };
}

// ── 저장 · 읽기 ─────────────────────────────────────────

export const DEMO_WORLD_STORAGE_KEY = "tc.demo.world.v1";

let cached: DemoWorld | null = null;
const listeners = new Set<() => void>();

function readStorage(): DemoWorld | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DEMO_WORLD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoWorld;
    if (parsed.version !== 1 || parsed.seededFor !== todayKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(world: DemoWorld): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DEMO_WORLD_STORAGE_KEY, JSON.stringify(world));
  } catch {
    /* 저장 공간이 없거나 막힌 브라우저 — 메모리에만 유지 */
  }
}

/** 현재 세계 (없으면 오늘 기준으로 새로 만든다) */
export function getDemoWorld(): DemoWorld {
  if (cached) return cached;
  cached = readStorage() ?? buildDemoWorld();
  return cached;
}

/** 세계를 바꾼다 — 바꾼 뒤 저장하고 구독자(useQuery)에게 알린다 */
export function mutateDemoWorld(fn: (world: DemoWorld) => void): void {
  const world = getDemoWorld();
  fn(world);
  writeStorage(world);
  listeners.forEach((l) => l());
}

/** 처음 상태로 (배너의 "체험 데이터 초기화") */
export function resetDemoWorld(): void {
  cached = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(DEMO_WORLD_STORAGE_KEY);
    } catch {
      /* noop */
    }
  }
  listeners.forEach((l) => l());
}

export function subscribeDemoWorld(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayIsoTime(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
