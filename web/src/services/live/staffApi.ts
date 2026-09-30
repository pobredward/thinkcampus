/**
 * 실서비스 · 직원 권한 — checkStaffAccess (Custom Claims)
 */

import type { CenterApi, CompanyApi, InstructorApi, PartnerApi, StaffApi } from "@/services/api";
import type {
  AttendanceSheet,
  CampusDto,
  ChatRoomDetail,
  ChatRoomDto,
  InquiryDto,
  InviteOfficerResult,
  OfficerDto,
  PartnerAccess,
  PartnerContact,
  PartnerHome,
  PartnerInquiries,
  PartnerInstructor,
  PartnerLesson,
  PartnerParticipation,
  PartnerReportData,
  PartnerRunOption,
  SurveyResultsDto,
  CenterInstructorDetail,
  CenterInstructorDto,
  CenterNotificationDto,
  CenterRosterPage,
  CenterRunSummary,
  CenterScheduleDay,
  CompanyHome,
  CreateProgramRunResult,
  InstructorHome,
  InstructorSessionDto,
  InstructorSessionWorkspace,
  ProgramRunDetail,
  ProgramRunSummaryDto,
  ProgramTemplateDto,
  RosterImportResult,
  SessionReportRow,
  StaffAccess,
  StaffDto,
} from "@/services/types";
import { call } from "./call";
import { watchChatLive } from "./chatWatch";

export function createLiveStaffApi(): StaffApi {
  return {
    async checkAccess() {
      const res = await call<Record<string, never>, Partial<StaffAccess>>("checkStaffAccess", {});
      return {
        allowed: !!res.allowed,
        companyAdmin: !!res.companyAdmin,
        centerAdmin: !!res.centerAdmin,
        instructor: !!res.instructor,
        campusIds: res.campusIds ?? [],
        displayName: res.displayName,
        email: res.email,
        phone: res.phone,
      };
    },
  };
}

export function createLiveCenterApi(): CenterApi {
  return {
    listRuns: async () => (await call<Record<string, never>, { runs: ProgramRunSummaryDto[] }>("listCenterRuns", {})).runs ?? [],
    getRunSummary: (programRunId) => call<{ programRunId: string }, CenterRunSummary>("getCenterRunSummary", { programRunId }),
    listSchedule: async (programRunId) =>
      (await call<{ programRunId: string }, { days: CenterScheduleDay[] }>("listCenterSchedule", { programRunId })).days ?? [],
    getAttendanceSheet: (runSessionId) => call<{ runSessionId: string }, AttendanceSheet>("getProgramRunAttendanceSheet", { runSessionId }),
    recordAttendance: async (records) => {
      await call("recordSessionAttendance", { records });
    },
    listRoster: (q) => call<typeof q, CenterRosterPage>("listCenterRoster", q),
    listInstructors: async (programRunId) =>
      (await call<{ programRunId: string }, { instructors: CenterInstructorDto[] }>("listCenterInstructors", { programRunId })).instructors ?? [],
    getInstructor: (staffId, programRunId) =>
      call<{ staffId: string; programRunId: string }, CenterInstructorDetail>("getCenterInstructor", { staffId, programRunId }),
    assignInstructor: async (runSessionId, staffId) => {
      await call("assignInstructorToSession", { runSessionId, staffId });
    },
    listReports: async (filter) => (await call<typeof filter, { reports: SessionReportRow[] }>("listSessionReports", filter)).reports ?? [],
    reviewReports: async (reportIds, action, note) => {
      await call("reviewSessionReports", { reportIds, action, note });
    },
    listNotifications: async (programRunId) =>
      (await call<{ programRunId: string }, { notifications: CenterNotificationDto[] }>("listCenterNotifications", { programRunId })).notifications ?? [],
    createNotice: async (input) => {
      const res = await call<typeof input, { notificationId: string; recipients?: number }>("createCenterNotice", input);
      return { id: res.notificationId, recipients: res.recipients ?? 0 };
    },
    // ── 채팅 · 민원 (functions/src/chat.ts · inquiries.ts) ──
    listChatRooms: async (programRunId) => (await call<{ programRunId: string }, { rooms: ChatRoomDto[] }>("listCenterChatRooms", { programRunId })).rooms ?? [],
    getChatRoom: (roomId) => call<{ roomId: string }, ChatRoomDetail>("getChatRoom", { roomId }),
    sendChatMessage: async (input) => {
      await call("sendChatMessage", input);
    },
    markChatRead: async (roomId) => {
      await call("markChatRead", { roomId });
    },
    watchChat: (target, onChange) => watchChatLive(target, onChange),
    listInquiries: async (filter) => (await call<typeof filter, { inquiries: InquiryDto[] }>("listInquiries", filter)).inquiries ?? [],
    getInquiry: async (inquiryId) => (await call<{ inquiryId: string }, { inquiry: InquiryDto }>("getInquiry", { inquiryId })).inquiry,
    fileInquiry: async (input) => (await call<typeof input, { inquiry: InquiryDto }>("fileInquiry", input)).inquiry,
    updateInquiry: async (input) => {
      await call("updateInquiry", input);
    },
    getSurveyResults: async (programRunId) =>
      (await call<{ programRunId: string }, { results: SurveyResultsDto | null }>("getSurveyResults", { programRunId })).results ?? null,
  };
}

export function createLiveInstructorApi(): InstructorApi {
  return {
    getHome: () => call<Record<string, never>, InstructorHome>("getInstructorHome", {}),
    listSessions: async () => (await call<Record<string, never>, { sessions: InstructorSessionDto[] }>("listInstructorSessions", {})).sessions ?? [],
    getSessionWorkspace: (runSessionId) =>
      call<{ runSessionId: string }, InstructorSessionWorkspace>("getInstructorSessionWorkspace", { runSessionId }),
    recordAttendance: async (records) => {
      await call("recordSessionAttendance", { records });
    },
    saveReportDrafts: async (drafts) => {
      await call("saveSessionReportDrafts", { drafts });
    },
    submitReports: (runSessionId) => call<{ runSessionId: string }, { submitted: number }>("submitSessionReports", { runSessionId }),
  };
}

export function createLiveCompanyApi(): CompanyApi {
  return {
    getHome: () => call<Record<string, never>, CompanyHome>("getCompanyHome", {}),
    listRuns: async () => (await call<Record<string, never>, { runs: ProgramRunSummaryDto[] }>("listProgramRuns", {})).runs ?? [],
    getRun: (programRunId) => call<{ programRunId: string }, ProgramRunDetail>("getProgramRun", { programRunId }),
    listTemplates: async () => (await call<Record<string, never>, { templates: ProgramTemplateDto[] }>("listProgramTemplates", {})).templates ?? [],
    listCampuses: async () => (await call<Record<string, never>, { campuses: CampusDto[] }>("listCampuses", {})).campuses ?? [],
    createRun: (input) => call<typeof input, CreateProgramRunResult>("createProgramRun", input),
    updateRunPolicy: async (programRunId, reportPolicy) => {
      await call("updateProgramRunPolicy", { programRunId, reportPolicy });
    },
    importRoster: (rows, dryRun) => call<{ rows: typeof rows; dryRun: boolean }, RosterImportResult>("importRoster", { rows, dryRun }),
    listStaff: async () => (await call<Record<string, never>, { staff: StaffDto[] }>("listStaff", {})).staff ?? [],
    listReports: async (filter) => (await call<typeof filter, { reports: SessionReportRow[] }>("listSessionReports", filter)).reports ?? [],
    reviewReports: async (reportIds, action, note) => {
      await call("reviewSessionReports", { reportIds, action, note });
    },
    listInquiries: async (filter) => (await call<typeof filter, { inquiries: InquiryDto[] }>("listInquiries", filter)).inquiries ?? [],
    listOfficers: async (programRunId) => (await call<{ programRunId: string }, { officers: OfficerDto[] }>("listOfficers", { programRunId })).officers ?? [],
    inviteOfficer: (input) => call<typeof input, InviteOfficerResult>("inviteOfficer", input),
    revokeOfficer: async (uid, programRunId) => {
      await call("revokeOfficer", { uid, programRunId });
    },
    updatePartnerSettings: async (programRunId, settings) => {
      await call("updateProgramRunPartnerSettings", { programRunId, nameMasking: settings.nameMasking });
    },
    getSurveyResults: async (programRunId) =>
      (await call<{ programRunId: string }, { results: SurveyResultsDto | null }>("getSurveyResults", { programRunId })).results ?? null,
    upsertSurvey: async (input) => {
      await call("upsertProgramRunSurvey", input);
    },
  };
}

/** 발주처 담당자 포털 — functions/src/partnerApi.ts (역할 officer · 배정된 운영 건만) */
export function createLivePartnerApi(): PartnerApi {
  return {
    getAccess: () => call<Record<string, never>, PartnerAccess>("getPartnerAccess", {}),
    completePasswordChange: async () => {
      await call("completeOfficerPasswordChange", {});
    },
    listRuns: async () => (await call<Record<string, never>, { runs: PartnerRunOption[] }>("listPartnerRuns", {})).runs ?? [],
    getHome: (programRunId) => call<{ programRunId: string }, PartnerHome>("getPartnerHome", { programRunId }),
    listLessons: async (programRunId) => (await call<{ programRunId: string }, { lessons: PartnerLesson[] }>("listPartnerLessons", { programRunId })).lessons ?? [],
    listInquiries: (programRunId) => call<{ programRunId: string }, PartnerInquiries>("listPartnerInquiries", { programRunId }),
    setOfficerNote: async (inquiryId, note) => {
      await call("setOfficerNote", { inquiryId, note });
    },
    getParticipation: (programRunId) => call<{ programRunId: string }, PartnerParticipation>("getPartnerParticipation", { programRunId }),
    getSurveyResults: async (programRunId) =>
      (await call<{ programRunId: string }, { results: SurveyResultsDto | null }>("getPartnerSurveyResults", { programRunId })).results ?? null,
    listInstructors: (programRunId) =>
      call<{ programRunId: string }, { instructors: PartnerInstructor[]; contact: PartnerContact }>("listPartnerInstructors", { programRunId }),
    getReportData: (programRunId) => call<{ programRunId: string }, PartnerReportData>("getPartnerReportData", { programRunId }),
  };
}
