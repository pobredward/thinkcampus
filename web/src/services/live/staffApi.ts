/**
 * 실서비스 · 직원 권한 — checkStaffAccess (Custom Claims)
 */

import type { CenterApi, CompanyApi, InstructorApi, StaffApi } from "@/services/api";
import type {
  AttendanceSheet,
  CampusDto,
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
  };
}
