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

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  companyAdmin: "회사 관리자",
  centerAdmin: "센터 관리자",
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

export type { Program, StudentAttendance, StudentReport, PastProgram };
