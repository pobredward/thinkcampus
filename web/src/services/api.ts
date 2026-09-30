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
  ChatRoomDetail,
  ChatRoomDto,
  FileInquiryInput,
  InquiryDto,
  InquiryFilter,
  InviteOfficerInput,
  InviteOfficerResult,
  OfficerDto,
  PartnerAccess,
  PartnerHome,
  PartnerInquiries,
  PartnerInstructor,
  PartnerContact,
  PartnerLesson,
  PartnerParticipation,
  PartnerReportData,
  PartnerRunOption,
  PendingSurveyDto,
  SendChatMessageInput,
  SubmitSurveyInput,
  SurveyDto,
  SurveyResultsDto,
  UpdateInquiryInput,
  UpsertSurveyInput,
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
  /** 로그인한 계정의 직원 권한 (통합 관리자 · 프로그램 매니저 · 강사) */
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

  // ── 채팅 (담당 선생님) ──
  /** 자녀 × 프로그램마다 방 하나 (수강 중 · 예정 · 끝난 지 30일 안) */
  listChatRooms(): Promise<ChatRoomDto[]>;
  getChatRoom(roomId: string): Promise<ChatRoomDetail>;
  sendChatMessage(input: SendChatMessageInput): Promise<void>;
  markChatRead(roomId: string): Promise<void>;
  /** 하단 탭 배지 */
  countUnreadChats(): Promise<number>;
  /** 새 메시지가 오면 onChange (실서비스는 Firestore 실시간, 체험판은 세계 변경 구독이 대신한다) */
  watchChat(target: { roomId?: string }, onChange: () => void): () => void;

  // ── 만족도 조사 ──
  /** 응답을 기다리는 조사 (홈 카드) */
  listPendingSurveys(): Promise<PendingSurveyDto[]>;
  getSurvey(studentId: string, programRunId: string): Promise<SurveyDto | null>;
  submitSurvey(input: SubmitSurveyInput): Promise<void>;
}

// ── 프로그램 매니저(센터) 앱 ───────────────────────────────

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

  // ── 학부모 채팅 ──
  /** 메시지가 있는 방 (답을 기다리는 방 먼저) */
  listChatRooms(programRunId: string): Promise<ChatRoomDto[]>;
  getChatRoom(roomId: string): Promise<ChatRoomDetail>;
  sendChatMessage(input: SendChatMessageInput): Promise<void>;
  markChatRead(roomId: string): Promise<void>;
  /** roomId 하나 또는 운영 건 전체(campusId 필수 — 실서비스 보안 규칙이 캠퍼스로 확인한다) */
  watchChat(target: { roomId?: string; programRunId?: string; campusId?: string }, onChange: () => void): () => void;

  // ── 민원 · 문의 ──
  listInquiries(filter: InquiryFilter): Promise<InquiryDto[]>;
  getInquiry(inquiryId: string): Promise<InquiryDto>;
  /** 채팅 메시지를 민원으로 등록 · 전화/현장 접수 기록 */
  fileInquiry(input: FileInquiryInput): Promise<InquiryDto>;
  /** 상태 변경 · 처리 내용 기록 */
  updateInquiry(input: UpdateInquiryInput): Promise<void>;

  // ── 만족도 조사 결과 ──
  getSurveyResults(programRunId: string): Promise<SurveyResultsDto | null>;
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

// ── 통합 관리자(회사) 앱 ───────────────────────────────────

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

  // ── 민원 (모든 캠퍼스) ──
  listInquiries(filter: InquiryFilter): Promise<InquiryDto[]>;

  // ── 발주처 담당자 계정 ──
  listOfficers(programRunId: string): Promise<OfficerDto[]>;
  /** 새 계정이면 임시 비밀번호를 한 번 돌려준다. 이미 있는 담당자면 운영 건만 더한다 */
  inviteOfficer(input: InviteOfficerInput): Promise<InviteOfficerResult>;
  /** 이 운영 건에서 뺀다 (다른 운영 건이 없으면 계정 사용 중지) */
  revokeOfficer(uid: string, programRunId: string): Promise<void>;
  updatePartnerSettings(programRunId: string, settings: { nameMasking: boolean }): Promise<void>;

  // ── 만족도 조사 ──
  getSurveyResults(programRunId: string): Promise<SurveyResultsDto | null>;
  upsertSurvey(input: UpsertSurveyInput): Promise<void>;
}

// ── 발주처 담당자(지자체 담당 공무원) 포털 ────────────────────

export interface PartnerApi {
  getAccess(): Promise<PartnerAccess>;
  /** 비밀번호를 바꾼 뒤 "첫 로그인" 표시를 지운다 */
  completePasswordChange(): Promise<void>;
  listRuns(): Promise<PartnerRunOption[]>;
  getHome(programRunId: string): Promise<PartnerHome>;
  listLessons(programRunId: string): Promise<PartnerLesson[]>;
  listInquiries(programRunId: string): Promise<PartnerInquiries>;
  setOfficerNote(inquiryId: string, note: string): Promise<void>;
  getParticipation(programRunId: string): Promise<PartnerParticipation>;
  getSurveyResults(programRunId: string): Promise<SurveyResultsDto | null>;
  listInstructors(programRunId: string): Promise<{ instructors: PartnerInstructor[]; contact: PartnerContact }>;
  getReportData(programRunId: string): Promise<PartnerReportData>;
}

export interface Api {
  staff: StaffApi;
  guardian: GuardianApi;
  center: CenterApi;
  instructor: InstructorApi;
  company: CompanyApi;
  partner: PartnerApi;
}
