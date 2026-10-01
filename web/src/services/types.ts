/**
 * 화면 ↔ 데이터 계층 계약 (DTO)
 *
 * 체험(services/demo)과 실서비스(services/live · Cloud Functions)가 똑같은 모양을 돌려준다.
 * 화면은 이 타입만 알면 되고, 어느 쪽 데이터인지는 모른다.
 *
 * Functions 쪽 응답 타입(functions/src/*.ts)과 이름·필드를 맞춘다 — 바꿀 때는 양쪽 같이.
 */

import type { Program } from "@/data/dummyProgram";
import type { StudentAttendance } from "@/data/dummyAttendance";
import type { StudentReport } from "@/data/dummyReport";
import type { PastProgram } from "@/data/dummyHistory";

// ── 공통 ─────────────────────────────────────────────────

export type AttendanceStatus = "present" | "late" | "absent";

/** 회차 리포트 상태: 강사 작성 중 → 검수 대기 → (회사 승인 대기) → 학부모 공개 */
export type SessionReportStatus = "draft" | "submitted" | "reviewed" | "published";

export const SESSION_REPORT_STATUS_LABEL: Record<SessionReportStatus, string> = {
  draft: "작성 중",
  submitted: "검수 대기",
  reviewed: "승인 대기",
  published: "학부모 공개",
};

export type ProgramRunStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";

export const PROGRAM_RUN_STATUS_LABEL: Record<ProgramRunStatus, string> = {
  draft: "준비 중",
  scheduled: "개강 예정",
  active: "운영 중",
  completed: "종료",
  cancelled: "취소",
};

export type StaffRole = "companyAdmin" | "centerAdmin" | "instructor";

/** 화면 표시 이름 — 내부 운영 3역할 (통합 관리자 = 본사, 프로그램 매니저 = 캠퍼스 운영, 강사). 권한 키 이름은 그대로 */
export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  companyAdmin: "통합 관리자",
  centerAdmin: "프로그램 매니저",
  instructor: "강사",
};

// ── 권한 (checkStaffAccess) ───────────────────────────────

export interface StaffAccess {
  allowed: boolean;
  companyAdmin: boolean;
  centerAdmin: boolean;
  instructor: boolean;
  campusIds: string[];
  /** staff 프로필 (있으면) */
  displayName?: string;
  email?: string;
  phone?: string;
}

// ── 운영 건 (센터·회사 공통) ───────────────────────────────

export interface ProgramSectionDto {
  id: string;
  label: string;
  sortOrder: number;
  studentCount: number;
}

export interface ProgramRunSummaryDto {
  id: string;
  contractCode: string;
  title: string;
  campusId: string;
  campusName: string;
  municipalityName: string;
  status: ProgramRunStatus;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  frequency: "weekly" | "biweekly";
  fixedDay: number;
  startTime: string;
  endTime: string;
  location: string;
  totalSessions: number;
  studentCount: number;
  sections: ProgramSectionDto[];
  reportPolicy: { requireCompanyApproval: boolean };
}

export interface CenterDashboardKpi {
  totalStudents: number;
  sectionsActive: number;
  sessionsToday: number;
  parallelSlotsToday: number;
  attendancePendingToday: number;
  reportsPendingReview: number;
  studentsWithoutGuardian: number;
  sessionsWithoutInstructor: number;
  /** 다음 수업일 (오늘 수업이 없을 때) */
  nextSessionDate: string | null;
  /** 학부모 채팅 — 답을 기다리는 방 수 · 가장 오래 기다린 메시지 시각 */
  chatWaiting: number;
  chatOldestWaitingAt: string | null;
  /** 아직 처리되지 않은 민원 (접수 · 처리 중) */
  complaintsOpen: number;
}

export interface CenterRunSummary {
  programRunId: string;
  contractCode: string;
  campusId: string;
  sections: ProgramSectionDto[];
  scheduleDates: string[];
  dashboard: CenterDashboardKpi;
}

// ── 센터 · 수업(시간표) ────────────────────────────────────

export interface CenterScheduleSession {
  id: string;
  sessionNumber: number;
  topic: string;
  sectionId: string;
  sectionLabel: string;
  startTime: string;
  endTime: string;
  location: string;
  instructorId: string | null;
  instructorName?: string;
  status: "scheduled" | "cancelled" | "completed";
  cancelReason?: string;
  enrolledCount: number;
  recordedCount: number;
  /** 회차 리포트 제출(검수 대기 이상) 학생 수 */
  reportedCount: number;
}

export interface CenterScheduleSlot {
  startTime: string;
  endTime: string;
  sessions: CenterScheduleSession[];
}

export interface CenterScheduleDay {
  date: string;
  sessionNumber: number;
  slots: CenterScheduleSlot[];
}

// ── 센터 · 출결 시트 ──────────────────────────────────────

export interface AttendanceSheetSession {
  id: string;
  sessionNumber: number;
  topic: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  sectionId: string;
  sectionLabel: string;
  location: string;
  instructorId: string | null;
  instructorName?: string;
  status: "scheduled" | "cancelled" | "completed";
}

export interface AttendanceSheetStudent {
  studentId: string;
  name: string;
  photoUrl?: string;
  status?: AttendanceStatus;
  lateMinutes?: number;
  participationScore?: number;
  /** 누가·언제 입력했는지 (센터 검수용) */
  recordedByName?: string;
  updatedAt?: string;
}

export interface AttendanceSheet {
  programRunId: string;
  contractCode: string;
  session: AttendanceSheetSession;
  /** 같은 날짜의 다른 반 회차 (빠르게 옮겨 가기) */
  siblings: Array<{ id: string; sectionLabel: string; startTime: string; recordedCount: number; enrolledCount: number }>;
  students: AttendanceSheetStudent[];
}

export interface RecordAttendanceInput {
  runSessionId: string;
  studentId: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  participationScore?: number;
}

// ── 센터 · 학생 ───────────────────────────────────────────

export type RosterGuardianFilter = "all" | "linked" | "unlinked";

export interface CenterRosterRow {
  enrollmentId: string;
  studentId: string;
  name: string;
  photoUrl?: string;
  sectionId: string;
  sectionLabel: string;
  householdId?: string;
  /** 같은 가구의 다른 수강생 이름 */
  siblingNames: string[];
  enrollmentCodeStatus: "unused" | "used" | "unknown";
  /** 미사용 등록코드 (초대 안내용) */
  enrollmentCode?: string;
  guardianSummary: string;
  guardianLinked: boolean;
  guardianPhone?: string;
  /** 지금까지 출석/지각/결석 */
  attendance: { present: number; late: number; absent: number };
}

export interface CenterRosterPage {
  rows: CenterRosterRow[];
  nextCursor: string | null;
  total: number;
}

export interface CenterRosterQuery {
  programRunId: string;
  sectionId?: string;
  q?: string;
  guardianFilter?: RosterGuardianFilter;
  pageSize?: number;
  cursor?: string;
}

// ── 센터 · 강사 ───────────────────────────────────────────

export interface CenterInstructorDto {
  staffId: string;
  name: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  bio?: string;
  specialties: string[];
  campusIds: string[];
  /** 이번 주 담당 회차 수 */
  sessionsThisWeek: number;
  /** 이 운영 건에서 담당하는 회차 수 */
  sessionsInRun: number;
}

export interface InstructorSessionOption {
  id: string;
  sessionNumber: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  sectionId: string;
  sectionLabel: string;
  topic: string;
  instructorId: string | null;
  instructorName?: string;
  /** 같은 시간에 이 강사가 이미 다른 반을 맡고 있는지 */
  conflict: boolean;
}

export interface CenterInstructorDetail {
  profile: CenterInstructorDto;
  /** 이 운영 건의 회차 전체 (배정 여부 포함) */
  sessions: InstructorSessionOption[];
}

// ── 센터 · 회차 리포트 검수 ───────────────────────────────

export interface SessionReportRow {
  id: string;
  runSessionId: string;
  programRunId: string;
  studentId: string;
  studentName: string;
  sectionLabel: string;
  sessionNumber: number;
  scheduledDate: string;
  topic: string;
  instructorId: string | null;
  instructorName: string;
  status: SessionReportStatus;
  attendanceStatus?: AttendanceStatus;
  participationScore: number | null;
  homeworkDone: boolean | null;
  feedback: string;
  highlights: string[];
  improvements: string[];
  submittedAt?: string;
  reviewedAt?: string;
  publishedAt?: string;
  returnNote?: string;
}

export type ReportReviewAction = "publish" | "approve" | "return";

export interface SessionReportFilter {
  programRunId?: string;
  runSessionId?: string;
  sectionId?: string;
  status?: SessionReportStatus | "pending";
}

// ── 센터 · 소통 ───────────────────────────────────────────

export interface CenterNotificationDto {
  id: string;
  type: "notice" | "attendance" | "report" | "schedule";
  title: string;
  body: string;
  /** 대상: 운영 건 전체 또는 반 */
  sectionId?: string;
  sectionLabel?: string;
  createdAt: string; // ISO
  createdByName: string;
  recipients: number;
}

export interface CreateNoticeInput {
  programRunId: string;
  title: string;
  body?: string;
  sectionId?: string;
}

// ── 강사 앱 ──────────────────────────────────────────────

export interface InstructorSessionDto {
  id: string;
  programRunId: string;
  contractCode: string;
  programTitle: string;
  campusName: string;
  sessionNumber: number;
  totalSessions: number;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  sectionId: string;
  sectionLabel: string;
  topic: string;
  location: string;
  status: "scheduled" | "cancelled" | "completed";
  enrolledCount: number;
  recordedCount: number;
  /** 리포트 제출(검수 대기 이상) 수 */
  reportedCount: number;
}

export interface InstructorHome {
  displayName: string;
  today: string;
  todaySessions: InstructorSessionDto[];
  upcoming: InstructorSessionDto[];
  runs: Array<{ programRunId: string; contractCode: string; title: string; campusName: string; scheduleLine: string; mySessions: number }>;
}

export interface LessonMaterialDto {
  lessonCode: string;
  title: string;
  planUrl?: string;
  slideViewUrl?: string;
  slideTemplateUrl?: string;
  activityUrl?: string;
}

export interface InstructorRosterEntry {
  studentId: string;
  name: string;
  photoUrl?: string;
  attendance?: AttendanceStatus;
  lateMinutes?: number;
  report: {
    status: SessionReportStatus;
    participationScore: number | null;
    homeworkDone: boolean | null;
    feedback: string;
    highlights: string[];
    improvements: string[];
    returnNote?: string;
  };
}

export interface InstructorSessionWorkspace {
  session: InstructorSessionDto;
  plan: {
    description: string;
    objectives: string[];
    teachingMethod?: string;
    curriculum: string[];
    materials: string[];
    rotationNote?: string;
  };
  lessonMaterials: LessonMaterialDto[];
  roster: InstructorRosterEntry[];
  /** 이 회차의 이전·다음 회차 (같은 반) */
  prevSessionId: string | null;
  nextSessionId: string | null;
}

export interface SaveReportDraftInput {
  runSessionId: string;
  studentId: string;
  participationScore: number | null;
  homeworkDone: boolean | null;
  feedback: string;
  highlights: string[];
  improvements: string[];
}

// ── 회사 앱 ──────────────────────────────────────────────

export interface CampusDto {
  id: string;
  name: string;
  municipalityName: string;
  address?: string;
  runCount: number;
  studentCount: number;
}

export interface StaffDto {
  uid: string;
  displayName: string;
  email?: string;
  phone?: string;
  role: StaffRole;
  campusIds: string[];
}

export interface CompanyHome {
  runs: ProgramRunSummaryDto[];
  campuses: CampusDto[];
  totalStudents: number;
  lastImport: { at: string; rowCount: number; contractCode: string } | null;
  reportsAwaitingApproval: number;
  /** 모든 캠퍼스의 미처리 민원 */
  complaintsOpen: number;
}

export interface ProgramTemplateDto {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  defaultSessionCount: number;
  defaultLessonCount: number;
  defaultFrequency: "weekly" | "biweekly";
  defaultFixedDay: number;
  defaultStartTime: string;
  defaultEndTime: string;
  sessions: Array<{ id: string; order: number; topic: string; lessonCount: number }>;
}

export interface ProgramRunDetail extends ProgramRunSummaryDto {
  host?: string;
  mapQuery?: string;
  programTemplateId: string;
  programTemplateTitle: string;
  sessions: Array<{
    id: string;
    sessionNumber: number;
    scheduledDate: string;
    startTime: string;
    endTime: string;
    sectionId: string;
    sectionLabel: string;
    topic: string;
    instructorName?: string;
    status: "scheduled" | "cancelled" | "completed";
  }>;
  instructors: Array<{ staffId: string; name: string; sessionCount: number }>;
  guardianLinkedCount: number;
  attendanceRate: number | null;
  createdAt?: string;
  /** 발주처 담당자 화면에서 학생 이름을 "김○준" 으로 가릴지 */
  partnerNameMasking: boolean;
}

export interface CreateProgramRunInput {
  contractCode: string;
  programTemplateId: string;
  campusId: string;
  municipalityName: string;
  title?: string;
  startDate: string;
  endDate?: string;
  frequency: "weekly" | "biweekly";
  fixedDay: number;
  startTime: string;
  endTime: string;
  location: string;
  sessionPlan: Array<{ sessionTemplateId: string; topic: string; lessonCount: number }>;
  defaultLessonCount: number;
  excludedDates?: string[];
  sections: Array<{ id: string; label: string }>;
  reportPolicy: { requireCompanyApproval: boolean };
  host?: string;
}

export interface CreateProgramRunResult {
  programRunId: string;
  contractCode: string;
  runSessionCount: number;
}

export interface RosterImportRowInput {
  studentName: string;
  birthDate: string;
  contractCode: string;
  campusId: string;
  householdKey?: string;
  guardianPhone?: string;
  externalStudentId?: string;
  sectionLabel?: string;
}

export interface RosterImportResult {
  dryRun: boolean;
  rowCount: number;
  createdStudents: number;
  updatedStudents: number;
  createdProgramEnrollments: number;
  createdEnrollmentCodes: number;
  previews: Array<{
    rowIndex: number;
    studentName: string;
    householdId: string;
    enrollmentCode: string;
    contractCode: string;
    sectionLabel?: string;
  }>;
  errors: Array<{ rowIndex: number; message: string }>;
}

// ── 학부모 앱 ─────────────────────────────────────────────

export interface ChildDto {
  guardianLinkId: string;
  studentId: string;
  studentName: string;
  campusId: string;
  campusName: string;
  relation: string;
}

export interface GuardianProgramBundle {
  enrollmentId: string;
  programRunId: string;
  status: "upcoming" | "active" | "completed" | "withdrawn";
  program: Program;
}

/** sessionAttendance 문서 + 학부모 공개된 회차 리포트 피드백 (lib/mapSessionAttendance 가 화면용으로 바꾼다) */
export interface AttendanceRecordDto {
  runSessionId: string;
  programRunId: string;
  studentId: string;
  status: AttendanceStatus;
  lateMinutes?: number;
  checkinTime?: string;
  participationScore?: number;
  homeworkDone?: boolean | null;
  feedback?: string;
  highlights?: string[];
  improvements?: string[];
}

export interface GuardianNotificationDto {
  id: string;
  type: "attendance" | "report" | "schedule" | "notice";
  title: string;
  body: string;
  date: string; // YYYY.MM.DD
  isRead: boolean;
}

export interface PendingHouseholdMember {
  studentId: string;
  maskedName: string;
}

export interface ShareLink {
  url: string;
  expiresAt: string; // ISO
}

// ── 채팅 (학부모 ↔ 캠퍼스 담당) ─────────────────────────────

export type ChatRole = "guardian" | "staff" | "system";
export type ChatMessageKind = "text" | "quick" | "inquiry" | "system";
/** 학부모 빠른 질문 칩 — materials · place 는 수업 정보로 바로 안내(시스템 답) */
export type QuickTopic = "materials" | "absence" | "place" | "etc";

export interface ChatRoomDto {
  id: string;
  programRunId: string;
  programTitle: string;
  campusId: string;
  campusName: string;
  studentId: string;
  studentName: string;
  sectionLabel: string;
  /** 직원 화면용 — "손영란 (모)" · "보호자 2명" */
  guardianLabel: string;
  /** 학부모 화면용 — "달성캠퍼스 담당 선생님" */
  staffLabel: string;
  /** 지난 프로그램 방은 종료 30일 뒤까지 읽기 전용 */
  status: "open" | "readonly";
  lastMessage: { text: string; fromRole: ChatRole; at: string } | null;
  /** 보는 사람 기준 안 읽은 메시지 */
  unread: number;
  /** 학부모 메시지에 아직 답이 없음 (직원 화면) */
  waiting: boolean;
  waitingSince: string | null;
  openInquiryCount: number;
}

export interface ChatMessageDto {
  id: string;
  fromRole: ChatRole;
  fromName: string;
  text: string;
  photoUrls: string[];
  kind: ChatMessageKind;
  inquiryId?: string;
  createdAt: string;
  mine: boolean;
  /** 상대가 읽었는지 (내 메시지에만 의미) */
  readByOther: boolean;
}

export interface ChatRoomDetail {
  room: ChatRoomDto;
  messages: ChatMessageDto[];
  /** 이 방에서 접수된 민원 (최근순) */
  inquiries: InquiryDto[];
  /** 답변 시간 안내 — "평일 09:00–18:00" */
  hours: string;
}

export interface SendChatMessageInput {
  roomId: string;
  text: string;
  /** 사진 (브라우저에서 줄인 JPEG data URL) — 최대 3장 */
  photoDataUrls?: string[];
  quick?: QuickTopic;
  /** 학부모가 "불편·요청 사항으로 접수" 를 켜고 보냄 */
  asInquiry?: { category: InquiryCategory };
}

// ── 민원 · 문의 ───────────────────────────────────────────

export type InquiryKind = "question" | "complaint";
export type InquiryCategory = "lesson" | "instructor" | "facility" | "safety" | "operation" | "etc";
export type InquiryChannel = "chat" | "phone" | "onsite";
export type InquiryStatus = "received" | "inProgress" | "resolved";

export const INQUIRY_KIND_LABEL: Record<InquiryKind, string> = { question: "문의", complaint: "민원" };
export const INQUIRY_CATEGORY_LABEL: Record<InquiryCategory, string> = {
  lesson: "수업 내용",
  instructor: "강사",
  facility: "시설·환경",
  safety: "안전",
  operation: "운영·안내",
  etc: "기타",
};
export const INQUIRY_CHANNEL_LABEL: Record<InquiryChannel, string> = { chat: "앱 채팅", phone: "전화", onsite: "현장" };
export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = { received: "접수", inProgress: "처리 중", resolved: "처리 완료" };

export interface InquiryDto {
  id: string;
  programRunId: string;
  programTitle: string;
  campusId: string;
  studentId?: string;
  /** "신민준 (1반)" — 발주처 화면은 운영 건 설정에 따라 "신○준 (1반)" */
  studentLabel: string;
  /** "신민준 보호자" · "보호자 (전화)" */
  reporterLabel: string;
  kind: InquiryKind;
  category: InquiryCategory;
  channel: InquiryChannel;
  title: string;
  body: string;
  photoUrls: string[];
  status: InquiryStatus;
  /** 처리 내용 — 학부모 채팅방 · 발주처 화면에 보인다 */
  resolution?: string;
  resolvedAt?: string;
  resolvedByName?: string;
  /** 발주처 담당자 의견 (선택) */
  officerNote?: string;
  /** 처리 결과에 대한 학부모 평가 1~5 (선택) */
  satisfaction?: number;
  chatRoomId?: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{ at: string; status: InquiryStatus; note?: string; byName: string }>;
}

export interface InquiryFilter {
  programRunId?: string;
  kind?: InquiryKind;
  status?: InquiryStatus | "open";
}

export interface FileInquiryInput {
  programRunId: string;
  kind: InquiryKind;
  category: InquiryCategory;
  channel: InquiryChannel;
  title: string;
  body: string;
  studentId?: string;
  /** 채팅 메시지를 민원으로 등록할 때 */
  chatRoomId?: string;
  messageId?: string;
}

export interface UpdateInquiryInput {
  inquiryId: string;
  status: InquiryStatus;
  /** 처리 내용 (처리 완료일 때 필수) — 학부모 · 발주처에 보인다 */
  resolution?: string;
  /** 진행 메모 (처리 이력에 남는다, 예: "시설팀에 점검 요청") */
  note?: string;
  /** 학부모 채팅방에 처리 결과를 알림 (채팅 접수 건) */
  notifyGuardian?: boolean;
}

// ── 만족도 조사 ───────────────────────────────────────────

export type SurveyStatus = "upcoming" | "open" | "closed";

export interface SurveyItemDto {
  id: string;
  /** 표·그래프용 짧은 이름 — "선생님" */
  label: string;
  /** 학부모에게 묻는 문장 */
  question: string;
}

export interface SurveyResponseDto {
  scores: Record<string, number>;
  review: string;
  consentPublic: boolean;
  submittedAt: string;
}

export interface SurveyDto {
  programRunId: string;
  programTitle: string;
  studentId: string;
  studentName: string;
  title: string;
  intro: string;
  items: SurveyItemDto[];
  allowReview: boolean;
  consentLabel: string;
  opensAt: string;
  closesAt: string;
  status: SurveyStatus;
  myResponse: SurveyResponseDto | null;
}

export interface SubmitSurveyInput {
  programRunId: string;
  studentId: string;
  scores: Record<string, number>;
  review: string;
  consentPublic: boolean;
}

/** 통합 관리자 — 조사 열기 · 기간 바꾸기 (문항은 기본 5문항) */
export interface UpsertSurveyInput {
  programRunId: string;
  title?: string;
  /** ISO — 보통 "YYYY-MM-DDT00:00:00+09:00" */
  opensAt: string;
  closesAt: string;
}

export interface PendingSurveyDto {
  programRunId: string;
  programTitle: string;
  studentId: string;
  studentName: string;
  title: string;
  closesAt: string;
}

export interface SurveyResultsDto {
  programRunId: string;
  title: string;
  status: SurveyStatus;
  opensAt: string;
  closesAt: string;
  /** 응답할 수 있는 학생 수 (보호자가 연결된 수강생) */
  eligible: number;
  responses: number;
  overallAvg: number | null;
  items: Array<{ id: string; label: string; question: string; avg: number | null; distribution: number[] }>;
  /** 후기 — 발주처 화면에는 공개 동의한 것만 */
  reviews: Array<{ id: string; text: string; studentLabel: string; submittedAt: string; consentPublic: boolean }>;
}

// ── 발주처 담당자 (지자체 담당 공무원) ─────────────────────────

export interface PartnerAccess {
  allowed: boolean;
  uid: string;
  displayName: string;
  email?: string;
  /** "달성군청 교육지원과" */
  organization: string;
  /** "주무관" */
  title?: string;
  programRunIds: string[];
  /** 임시 비밀번호로 처음 로그인했으면 바꾸게 한다 */
  mustChangePassword: boolean;
}

export interface PartnerRunOption {
  id: string;
  title: string;
  contractCode: string;
  campusName: string;
  municipalityName: string;
  status: ProgramRunStatus;
  startDate: string;
  endDate: string | null;
}

export interface PartnerAttendanceRow {
  sessionNumber: number;
  date: string;
  enrolled: number;
  present: number;
  late: number;
  absent: number;
  unrecorded: number;
  /** (출석 + 지각) / 입력된 인원 — 아직 수업 전이면 null */
  rate: number | null;
}

export interface PartnerInquiryStats {
  complaints: { received: number; inProgress: number; resolved: number };
  /** 앱 채팅 문의 (학부모가 먼저 보낸 질문) + 전화 문의 */
  questions: { received: number; answered: number; avgFirstReplyMinutes: number | null };
}

export interface PartnerLesson {
  sessionNumber: number;
  date: string;
  /** "10:00–12:00 (1~3반)" */
  slots: string[];
  topic: string;
  description: string;
  objectives: string[];
  curriculum: string[];
  materials: string[];
  lessonCount: number;
  instructors: Array<{ name: string; sections: string[] }>;
  status: "done" | "today" | "upcoming";
  attendance: PartnerAttendanceRow;
}

export interface PartnerHome {
  run: ProgramRunSummaryDto;
  host?: string;
  progress: { done: number; total: number; nextDate: string | null };
  attendance: { rate: number | null; rows: PartnerAttendanceRow[] };
  inquiryStats: PartnerInquiryStats;
  nextLesson: PartnerLesson | null;
  recentComplaints: InquiryDto[];
  recentNotices: Array<{ id: string; title: string; createdAt: string; recipients: number }>;
  survey: { title: string; status: SurveyStatus; responses: number; eligible: number; overallAvg: number | null } | null;
}

export interface PartnerParticipation {
  sessions: Array<{ sessionNumber: number; date: string; done: boolean }>;
  sections: Array<{ id: string; label: string; studentCount: number; rate: number | null }>;
  students: Array<{
    studentId: string;
    name: string;
    sectionLabel: string;
    statuses: Array<AttendanceStatus | null>;
    present: number;
    late: number;
    absent: number;
  }>;
  masked: boolean;
}

export interface PartnerInstructor {
  staffId: string;
  name: string;
  title?: string;
  bio?: string;
  specialties: string[];
  photoUrl?: string;
  sessions: Array<{ sessionNumber: number; date: string; sectionLabel: string; topic: string }>;
}

export interface PartnerContact {
  campusName: string;
  address?: string;
  managerName: string;
  managerRole: string;
  phone?: string;
  hours: string;
}

export interface PartnerInquiries {
  stats: PartnerInquiryStats;
  complaints: InquiryDto[];
  /** 전화·현장으로 들어와 기록된 문의 */
  loggedQuestions: InquiryDto[];
}

/** 보고서 생성에 쓰는 데이터 한 벌 — 브라우저가 HWPX · DOCX · PDF · XLSX 로 만든다 */
export interface PartnerReportData {
  generatedAt: string;
  run: {
    id: string;
    title: string;
    contractCode: string;
    municipalityName: string;
    host?: string;
    campusName: string;
    location: string;
    targetGrade: string;
    startDate: string;
    endDate: string | null;
    scheduleLine: string;
    totalSessions: number;
    lessonsPerSession: number;
    minutesPerLesson: number;
    sections: Array<{ label: string; studentCount: number }>;
    studentCount: number;
    purpose: string;
    overview: string;
    features: string[];
  };
  lessons: PartnerLesson[];
  instructors: PartnerInstructor[];
  contact: PartnerContact;
  participation: PartnerParticipation;
  attendanceRows: PartnerAttendanceRow[];
  overallAttendanceRate: number | null;
  inquiries: PartnerInquiries;
  survey: SurveyResultsDto | null;
  notices: Array<{ title: string; createdAt: string; recipients: number }>;
  finalReports: { issued: number; students: number; grades: Record<"S" | "A" | "B" | "C", number>; topStrengths: Array<{ label: string; count: number }> } | null;
}

// ── 통합 관리자 · 발주처 담당자 계정 ───────────────────────────

export interface OfficerDto {
  uid: string;
  displayName: string;
  email: string;
  organization: string;
  title?: string;
  phone?: string;
  programRunIds: string[];
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface InviteOfficerInput {
  programRunId: string;
  email: string;
  displayName: string;
  organization: string;
  title?: string;
  phone?: string;
}

export interface InviteOfficerResult {
  uid: string;
  email: string;
  /** 새 계정이면 임시 비밀번호 (화면에 한 번만 보여 준다). 이미 있는 계정에 운영 건만 더했으면 null */
  tempPassword: string | null;
}

export type { Program, StudentAttendance, StudentReport, PastProgram };
