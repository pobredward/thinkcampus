/**
 * 데이터 계층 인터페이스 — 화면은 이 인터페이스만 호출한다.
 *
 *   services/demo/*  체험판 (브라우저 메모리 + sessionStorage 의 DemoWorld)
 *   services/live/*  실서비스 (Firebase Auth · Firestore · Cloud Functions)
 *
 * 두 구현이 같은 계약(types.ts)을 지키므로, 화면은 어느 쪽 데이터인지 모른다.
 * 새 화면이 필요로 하는 조회·저장은 여기에 메서드를 추가하고 양쪽 구현을 같이 채운다.
 */

import type {
  AttendanceRecordDto,
  AttendanceSheet,
  CampusDto,
  CenterInstructorDetail,
  CenterInstructorDto,
  CenterNotificationDto,
  CenterRosterPage,
  CenterRosterQuery,
  CenterRunSummary,
  CenterScheduleDay,
  ChildDto,
  CompanyHome,
  CreateNoticeInput,
  CreateProgramRunInput,
  CreateProgramRunResult,
  GuardianNotificationDto,
  GuardianProgramBundle,
  InstructorHome,
  InstructorSessionDto,
  InstructorSessionWorkspace,
  PendingHouseholdMember,
  ProgramRunDetail,
  ProgramRunSummaryDto,
  ProgramTemplateDto,
  RecordAttendanceInput,
  ReportReviewAction,
  RosterImportResult,
  RosterImportRowInput,
  SaveReportDraftInput,
  SessionReportFilter,
  SessionReportRow,
  ShareLink,
  StaffAccess,
  StaffDto,
  StudentReport,
} from "./types";

// ── 권한 ─────────────────────────────────────────────────

export interface StaffApi {
  /** 로그인한 계정의 직원 권한 (회사 관리자 · 센터 관리자 · 강사) */
  checkAccess(): Promise<StaffAccess>;
}

// ── 학부모 앱 ─────────────────────────────────────────────

export interface GuardianApi {
  /** 보호자에게 연결된 자녀 (이름순, 중복 학생 제거) */
  listChildren(opts?: { activeOnly?: boolean }): Promise<ChildDto[]>;
  /** 자녀의 수강 목록 (수강 중 · 예정 · 완료) — 회차·수업 내용·강사 포함 */
  listProgramBundles(studentId: string): Promise<GuardianProgramBundle[]>;
  /** 자녀의 특정 프로그램 (없으면 null) */
  getProgramBundle(studentId: string, programRunId: string): Promise<GuardianProgramBundle | null>;
  /** 자녀의 회차 출결 (+ 학부모 공개된 회차 리포트 피드백). programRunId 없으면 전체 */
  listAttendance(studentId: string, programRunId?: string): Promise<AttendanceRecordDto[]>;
  /** 종합 리포트 (프로그램 종료 후 발급) — 아직 없으면 null */
  getFinalReport(studentId: string, programRunId: string): Promise<StudentReport | null>;
  /** 알림 (최근순) */
  listNotifications(): Promise<GuardianNotificationDto[]>;
  markNotificationRead(id: string): Promise<void>;
  /** 종합 리포트 공유 링크 (7일) */
  createShareLink(reportId: string): Promise<ShareLink>;
  /** 형제 가구 연동 — 같은 가구인데 아직 내 계정에 연결되지 않은 학생 */
  listPendingHousehold(): Promise<PendingHouseholdMember[]>;
  linkHouseholdMember(studentId: string, birthDate: string): Promise<void>;
  /** 다른 보호자 초대 (전화번호 허용 목록) */
  addGuardianPhone(studentId: string, phone: string, relation: string): Promise<void>;
  /** 회원 탈퇴 */
  deleteAccount(): Promise<void>;
}

// ── 센터 관리자 앱 ────────────────────────────────────────

export interface CenterApi {
  /** 내 캠퍼스의 운영 건 (진행 중 먼저) */
  listRuns(): Promise<ProgramRunSummaryDto[]>;
  getRunSummary(programRunId: string): Promise<CenterRunSummary>;
  /** 날짜별 시간표 — 같은 시간대(슬롯)에 반이 나란히 */
  listSchedule(programRunId: string): Promise<CenterScheduleDay[]>;
  getAttendanceSheet(runSessionId: string): Promise<AttendanceSheet>;
  recordAttendance(inputs: RecordAttendanceInput[]): Promise<void>;
  listRoster(query: CenterRosterQuery): Promise<CenterRosterPage>;
  /** 내 캠퍼스에서 수업할 수 있는 강사 (이 운영 건 담당 회차 수 포함) */
  listInstructors(programRunId: string): Promise<CenterInstructorDto[]>;
  getInstructor(staffId: string, programRunId: string): Promise<CenterInstructorDetail>;
  /** 회차에 강사 배정 (staffId null 이면 배정 해제) */
  assignInstructor(runSessionId: string, staffId: string | null): Promise<void>;
  listReports(filter: SessionReportFilter): Promise<SessionReportRow[]>;
  /** 검수: publish(학부모 공개) · approve(회사 승인 요청) · return(강사에게 반려) */
  reviewReports(reportIds: string[], action: ReportReviewAction, note?: string): Promise<void>;
  listNotifications(programRunId: string): Promise<CenterNotificationDto[]>;
  createNotice(input: CreateNoticeInput): Promise<{ id: string; recipients: number }>;
}

// ── 강사 앱 ──────────────────────────────────────────────

export interface InstructorApi {
  getHome(): Promise<InstructorHome>;
  /** 내 담당 회차 전체 (날짜순) */
  listSessions(): Promise<InstructorSessionDto[]>;
  getSessionWorkspace(runSessionId: string): Promise<InstructorSessionWorkspace>;
  recordAttendance(inputs: RecordAttendanceInput[]): Promise<void>;
  /** 회차 리포트 임시 저장 (학생별) */
  saveReportDrafts(inputs: SaveReportDraftInput[]): Promise<void>;
  /** 회차의 리포트를 센터 검수로 넘긴다 — 출결이 있는 학생만 */
  submitReports(runSessionId: string): Promise<{ submitted: number }>;
}

// ── 회사 관리자 앱 ────────────────────────────────────────

export interface CompanyApi {
  getHome(): Promise<CompanyHome>;
  listRuns(): Promise<ProgramRunSummaryDto[]>;
  getRun(programRunId: string): Promise<ProgramRunDetail>;
  listTemplates(): Promise<ProgramTemplateDto[]>;
  listCampuses(): Promise<CampusDto[]>;
  createRun(input: CreateProgramRunInput): Promise<CreateProgramRunResult>;
  updateRunPolicy(programRunId: string, policy: { requireCompanyApproval: boolean }): Promise<void>;
  /** 명단 등록 — dryRun 이면 미리보기만 */
  importRoster(rows: RosterImportRowInput[], dryRun: boolean): Promise<RosterImportResult>;
  listStaff(): Promise<StaffDto[]>;
  /** 회사 승인 대기(reviewed) 리포트 */
  listReports(filter: SessionReportFilter): Promise<SessionReportRow[]>;
  reviewReports(reportIds: string[], action: ReportReviewAction, note?: string): Promise<void>;
}

export interface Api {
  staff: StaffApi;
  guardian: GuardianApi;
  center: CenterApi;
  instructor: InstructorApi;
  company: CompanyApi;
}
