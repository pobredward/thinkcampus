/**
 * 체험판 · 센터 관리자 API — 달성캠퍼스(이정민)
 * 실서비스 Functions(getCenterRunSummary · listCenterSchedule · getProgramRunAttendanceSheet · …)와 같은 응답을 만든다.
 */

import { todayKey } from "@/lib/dates";
import type { CenterApi } from "@/services/api";
import type {
  AttendanceSheet,
  CenterDashboardKpi,
  CenterInstructorDto,
  CenterNotificationDto,
  CenterRosterRow,
  CenterScheduleDay,
  CenterScheduleSession,
  InstructorSessionOption,
  SessionReportFilter,
  SessionReportRow,
} from "@/services/types";
import { applyReportReview, listReportRows } from "./reports";
import {
  activeEnrollments,
  delay,
  instructorName,
  runById,
  runSessionById,
  runSummaryDto,
  sameWeek,
  sectionDtos,
  sectionLabel,
  sessionCounts,
  staffById,
} from "./select";
import { type DemoRunSession, type DemoWorld, getDemoWorld, mutateDemoWorld, nowIso } from "./world";

function assertCampus(w: DemoWorld, campusIds: string[], programRunId: string) {
  const run = runById(w, programRunId);
  if (!campusIds.includes(run.campusId)) throw new Error("이 캠퍼스의 운영 건이 아닙니다.");
  return run;
}

function scheduleSession(w: DemoWorld, rs: DemoRunSession): CenterScheduleSession {
  const run = runById(w, rs.programRunId);
  return {
    id: rs.id,
    sessionNumber: rs.sessionNumber,
    topic: rs.topic,
    sectionId: rs.sectionId,
    sectionLabel: sectionLabel(run, rs.sectionId),
    startTime: rs.startTime,
    endTime: rs.endTime,
    location: rs.location,
    instructorId: rs.instructorId,
    instructorName: instructorName(w, rs.instructorId),
    status: rs.status,
    cancelReason: rs.cancelReason,
    ...sessionCounts(w, rs),
  };
}

export function buildScheduleDays(w: DemoWorld, programRunId: string): CenterScheduleDay[] {
  const run = runById(w, programRunId);
  const sessions = w.runSessions.filter((s) => s.programRunId === programRunId);
  const byDate = new Map<string, DemoRunSession[]>();
  for (const s of sessions) {
    const list = byDate.get(s.scheduledDate) ?? [];
    list.push(s);
    byDate.set(s.scheduledDate, list);
  }
  const sectionOrder = (id: string) => run.sections.find((x) => x.id === id)?.sortOrder ?? 99;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const bySlot = new Map<string, DemoRunSession[]>();
      for (const s of list) {
        const key = `${s.startTime}-${s.endTime}`;
        const arr = bySlot.get(key) ?? [];
        arr.push(s);
        bySlot.set(key, arr);
      }
      return {
        date,
        sessionNumber: list[0]?.sessionNumber ?? 0,
        slots: [...bySlot.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, arr]) => ({
            startTime: arr[0].startTime,
            endTime: arr[0].endTime,
            sessions: arr.sort((a, b) => sectionOrder(a.sectionId) - sectionOrder(b.sectionId)).map((s) => scheduleSession(w, s)),
          })),
      };
    });
}

export function buildDashboard(w: DemoWorld, programRunId: string): CenterDashboardKpi {
  const run = runById(w, programRunId);
  const today = todayKey();
  const sessions = w.runSessions.filter((s) => s.programRunId === programRunId && s.status !== "cancelled");
  const todays = sessions.filter((s) => s.scheduledDate === today);
  const future = sessions.filter((s) => s.scheduledDate > today).map((s) => s.scheduledDate).sort();
  const enrolled = activeEnrollments(w, programRunId);
  const studentIds = new Set(enrolled.map((e) => e.studentId));
  const withoutGuardian = w.students.filter((s) => studentIds.has(s.id) && s.guardianUids.length === 0).length;
  const pendingReview = w.reports.filter(
    (r) => r.programRunId === programRunId && (r.status === "submitted" || (run.reportPolicy.requireCompanyApproval && r.status === "reviewed")),
  ).length;
  const attendancePendingToday = todays.reduce((acc, s) => {
    const c = sessionCounts(w, s);
    return acc + Math.max(0, c.enrolledCount - c.recordedCount);
  }, 0);
  return {
    totalStudents: enrolled.length,
    sectionsActive: run.sections.length,
    sessionsToday: todays.length,
    parallelSlotsToday: new Set(todays.map((s) => `${s.startTime}-${s.endTime}`)).size,
    attendancePendingToday,
    reportsPendingReview: pendingReview,
    studentsWithoutGuardian: withoutGuardian,
    sessionsWithoutInstructor: sessions.filter((s) => !s.instructorId && s.scheduledDate >= today).length,
    nextSessionDate: future[0] ?? null,
  };
}

export function buildInstructorDto(w: DemoWorld, staffUid: string, programRunId: string): CenterInstructorDto {
  const staff = staffById(w, staffUid)!;
  const today = todayKey();
  const mine = w.runSessions.filter((s) => s.instructorId === staffUid && s.status !== "cancelled");
  return {
    staffId: staff.uid,
    name: staff.displayName,
    email: staff.email,
    phone: staff.phone,
    bio: staff.bio,
    specialties: staff.specialties,
    campusIds: staff.campusIds,
    sessionsThisWeek: mine.filter((s) => sameWeek(s.scheduledDate, today)).length,
    sessionsInRun: mine.filter((s) => s.programRunId === programRunId).length,
  };
}

export function createDemoCenterApi(campusIds: string[], actorUid: string): CenterApi {
  return {
    async listRuns() {
      const w = getDemoWorld();
      const order = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 } as const;
      const runs = w.runs
        .filter((r) => campusIds.includes(r.campusId))
        .sort((a, b) => order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate))
        .map((r) => runSummaryDto(w, r));
      return delay(runs);
    },

    async getRunSummary(programRunId) {
      const w = getDemoWorld();
      const run = assertCampus(w, campusIds, programRunId);
      const dates = [...new Set(w.runSessions.filter((s) => s.programRunId === programRunId).map((s) => s.scheduledDate))].sort();
      return delay({
        programRunId,
        contractCode: run.contractCode,
        campusId: run.campusId,
        sections: sectionDtos(w, run),
        scheduleDates: dates,
        dashboard: buildDashboard(w, programRunId),
      });
    },

    async listSchedule(programRunId) {
      const w = getDemoWorld();
      assertCampus(w, campusIds, programRunId);
      return delay(buildScheduleDays(w, programRunId));
    },

    async getAttendanceSheet(runSessionId) {
      const w = getDemoWorld();
      const rs = runSessionById(w, runSessionId);
      const run = assertCampus(w, campusIds, rs.programRunId);
      const enrolled = activeEnrollments(w, rs.programRunId, rs.sectionId);
      const students = enrolled
        .map((e) => {
          const s = w.students.find((x) => x.id === e.studentId)!;
          const att = w.attendance.find((a) => a.id === `${rs.id}__${s.id}`);
          const report = w.reports.find((r) => r.id === `${rs.id}__${s.id}`);
          return {
            studentId: s.id,
            name: s.name,
            photoUrl: s.photoUrl,
            status: att?.status,
            lateMinutes: att?.lateMinutes,
            participationScore: report?.participationScore ?? undefined,
            recordedByName: att ? (instructorName(w, att.recordedByUid) ?? "센터") : undefined,
            updatedAt: att?.updatedAt,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
      const siblings = w.runSessions
        .filter((s) => s.programRunId === rs.programRunId && s.scheduledDate === rs.scheduledDate && s.id !== rs.id)
        .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.sectionId.localeCompare(b.sectionId))
        .map((s) => {
          const c = sessionCounts(w, s);
          return { id: s.id, sectionLabel: sectionLabel(run, s.sectionId), startTime: s.startTime, recordedCount: c.recordedCount, enrolledCount: c.enrolledCount };
        });
      const sheet: AttendanceSheet = {
        programRunId: rs.programRunId,
        contractCode: run.contractCode,
        session: {
          id: rs.id,
          sessionNumber: rs.sessionNumber,
          topic: rs.topic,
          scheduledDate: rs.scheduledDate,
          startTime: rs.startTime,
          endTime: rs.endTime,
          sectionId: rs.sectionId,
          sectionLabel: sectionLabel(run, rs.sectionId),
          location: rs.location,
          instructorId: rs.instructorId,
          instructorName: instructorName(w, rs.instructorId),
          status: rs.status,
        },
        siblings,
        students,
      };
      return delay(sheet);
    },

    async recordAttendance(inputs) {
      recordAttendanceInWorld(inputs, actorUid, campusIds);
      await delay(undefined, 150);
    },

    async listRoster(query) {
      const w = getDemoWorld();
      const run = assertCampus(w, campusIds, query.programRunId);
      const q = query.q?.trim().toLowerCase();
      const rows: CenterRosterRow[] = activeEnrollments(w, run.id, query.sectionId)
        .map((e) => {
          const s = w.students.find((x) => x.id === e.studentId)!;
          const code = w.enrollmentCodes.find((c) => c.studentId === s.id && c.programRunId === run.id);
          const linked = s.guardianUids.length > 0;
          const guardianPhone = s.guardianUids.map((uid) => w.guardians.find((g) => g.uid === uid)?.phone).find(Boolean);
          const siblingNames = w.students.filter((x) => x.householdId === s.householdId && x.id !== s.id).map((x) => x.name);
          const att = w.attendance.filter((a) => a.studentId === s.id && a.programRunId === run.id);
          return {
            enrollmentId: e.id,
            studentId: s.id,
            name: s.name,
            photoUrl: s.photoUrl,
            sectionId: e.sectionId,
            sectionLabel: sectionLabel(run, e.sectionId),
            householdId: s.householdId,
            siblingNames,
            enrollmentCodeStatus: code ? code.status : "unknown",
            enrollmentCode: code?.status === "unused" ? code.code : undefined,
            guardianSummary: linked ? `보호자 ${s.guardianUids.length}명 연결` : "보호자 미연결",
            guardianLinked: linked,
            guardianPhone,
            attendance: {
              present: att.filter((a) => a.status === "present").length,
              late: att.filter((a) => a.status === "late").length,
              absent: att.filter((a) => a.status === "absent").length,
            },
          } satisfies CenterRosterRow;
        })
        .filter((r) => !q || r.name.toLowerCase().includes(q))
        .filter((r) =>
          query.guardianFilter === "linked" ? r.guardianLinked : query.guardianFilter === "unlinked" ? !r.guardianLinked : true,
        )
        .sort((a, b) => a.sectionLabel.localeCompare(b.sectionLabel, "ko") || a.name.localeCompare(b.name, "ko"));
      const pageSize = query.pageSize ?? 200;
      const start = query.cursor ? Number(query.cursor) : 0;
      const page = rows.slice(start, start + pageSize);
      return delay({ rows: page, nextCursor: start + pageSize < rows.length ? String(start + pageSize) : null, total: rows.length });
    },

    async listInstructors(programRunId) {
      const w = getDemoWorld();
      assertCampus(w, campusIds, programRunId);
      const list = w.staff
        .filter((s) => s.role === "instructor" && s.campusIds.some((c) => campusIds.includes(c)))
        .map((s) => buildInstructorDto(w, s.uid, programRunId))
        .sort((a, b) => b.sessionsInRun - a.sessionsInRun || a.name.localeCompare(b.name, "ko"));
      return delay(list);
    },

    async getInstructor(staffId, programRunId) {
      const w = getDemoWorld();
      const run = assertCampus(w, campusIds, programRunId);
      const staff = staffById(w, staffId);
      if (!staff || staff.role !== "instructor") throw new Error("강사를 찾을 수 없습니다.");
      const mine = w.runSessions.filter((s) => s.instructorId === staffId && s.status !== "cancelled");
      const sessions: InstructorSessionOption[] = w.runSessions
        .filter((s) => s.programRunId === programRunId)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime) || a.sectionId.localeCompare(b.sectionId))
        .map((s) => ({
          id: s.id,
          sessionNumber: s.sessionNumber,
          scheduledDate: s.scheduledDate,
          startTime: s.startTime,
          endTime: s.endTime,
          sectionId: s.sectionId,
          sectionLabel: sectionLabel(run, s.sectionId),
          topic: s.topic,
          instructorId: s.instructorId,
          instructorName: instructorName(w, s.instructorId),
          conflict:
            s.instructorId !== staffId &&
            mine.some((m) => m.scheduledDate === s.scheduledDate && m.startTime < s.endTime && s.startTime < m.endTime),
        }));
      return delay({ profile: buildInstructorDto(w, staffId, programRunId), sessions });
    },

    async assignInstructor(runSessionId, staffId) {
      mutateDemoWorld((w) => {
        const rs = runSessionById(w, runSessionId);
        assertCampus(w, campusIds, rs.programRunId);
        if (staffId) {
          const staff = staffById(w, staffId);
          if (!staff || staff.role !== "instructor") throw new Error("강사를 찾을 수 없습니다.");
          const clash = w.runSessions.find(
            (m) => m.id !== rs.id && m.instructorId === staffId && m.scheduledDate === rs.scheduledDate && m.startTime < rs.endTime && rs.startTime < m.endTime,
          );
          if (clash) {
            const run = runById(w, clash.programRunId);
            throw new Error(`${staff.displayName} 강사는 같은 시간에 ${sectionLabel(run, clash.sectionId)} 수업이 있어요.`);
          }
        }
        rs.instructorId = staffId;
        // 이 회차의 작성 중 리포트는 새 강사 몫이 된다
        for (const r of w.reports) if (r.runSessionId === rs.id && r.status === "draft") r.instructorId = staffId;
      });
      await delay(undefined, 150);
    },

    async listReports(filter: SessionReportFilter): Promise<SessionReportRow[]> {
      const w = getDemoWorld();
      if (filter.programRunId) assertCampus(w, campusIds, filter.programRunId);
      return delay(listReportRows(w, filter, (run) => campusIds.includes(run.campusId)));
    },

    async reviewReports(reportIds, action, note) {
      mutateDemoWorld((w) => applyReportReview(w, reportIds, action, note, "center", actorUid));
      await delay(undefined, 200);
    },

    async listNotifications(programRunId) {
      const w = getDemoWorld();
      const run = assertCampus(w, campusIds, programRunId);
      const list: CenterNotificationDto[] = w.notifications
        .filter((n) => n.programRunId === programRunId && !n.studentId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          sectionId: n.sectionId,
          sectionLabel: n.sectionId ? sectionLabel(run, n.sectionId) : undefined,
          createdAt: n.createdAt,
          createdByName: staffById(w, n.createdByUid)?.displayName ?? "센터",
          recipients: n.recipients,
        }));
      return delay(list);
    },

    async createNotice(input) {
      let created = { id: "", recipients: 0 };
      mutateDemoWorld((w) => {
        const run = assertCampus(w, campusIds, input.programRunId);
        const title = input.title.trim();
        if (!title) throw new Error("제목을 입력해 주세요.");
        if (input.sectionId && !run.sections.some((s) => s.id === input.sectionId)) throw new Error("반을 찾을 수 없습니다.");
        const targets = activeEnrollments(w, run.id, input.sectionId).map((e) => e.studentId);
        const uids = new Set<string>();
        for (const sid of targets) {
          for (const uid of w.students.find((s) => s.id === sid)?.guardianUids ?? []) uids.add(uid);
        }
        const id = `ntf-${Date.now().toString(36)}`;
        w.notifications.unshift({
          id,
          type: "notice",
          title,
          body: input.body?.trim() ?? "",
          programRunId: run.id,
          sectionId: input.sectionId,
          createdAt: nowIso(),
          createdByUid: actorUid,
          recipients: uids.size,
          readBy: [],
        });
        created = { id, recipients: uids.size };
      });
      return delay(created, 200);
    },
  };
}

/** 출결 저장 — 센터·강사가 같이 쓴다 (실서비스 recordSessionAttendance) */
export function recordAttendanceInWorld(
  inputs: Array<{ runSessionId: string; studentId: string; status: "present" | "late" | "absent"; lateMinutes?: number; participationScore?: number }>,
  actorUid: string,
  campusIds: string[] | null,
): void {
  mutateDemoWorld((w) => {
    for (const input of inputs) {
      const rs = runSessionById(w, input.runSessionId);
      if (campusIds) assertCampus(w, campusIds, rs.programRunId);
      if (!activeEnrollments(w, rs.programRunId, rs.sectionId).some((e) => e.studentId === input.studentId)) {
        throw new Error("이 반의 학생이 아닙니다.");
      }
      const id = `${rs.id}__${input.studentId}`;
      const at = nowIso();
      const existing = w.attendance.find((a) => a.id === id);
      const lateMinutes = input.status === "late" ? (input.lateMinutes ?? 5) : undefined;
      if (existing) {
        existing.status = input.status;
        existing.lateMinutes = lateMinutes;
        existing.recordedByUid = actorUid;
        existing.updatedAt = at;
        if (input.status === "absent") existing.checkinTime = undefined;
      } else {
        w.attendance.push({
          id,
          runSessionId: rs.id,
          programRunId: rs.programRunId,
          studentId: input.studentId,
          status: input.status,
          lateMinutes,
          checkinTime: input.status === "absent" ? undefined : rs.startTime,
          recordedByUid: actorUid,
          updatedAt: at,
        });
      }
      // 리포트 문서가 없으면 작성 중 상태로 하나 만든다 (강사 화면에서 이어서 작성)
      let report = w.reports.find((r) => r.id === id);
      if (!report) {
        report = {
          id,
          runSessionId: rs.id,
          programRunId: rs.programRunId,
          studentId: input.studentId,
          instructorId: rs.instructorId,
          status: "draft",
          participationScore: null,
          homeworkDone: null,
          feedback: "",
          highlights: [],
          improvements: [],
          updatedAt: at,
        };
        w.reports.push(report);
      }
      if (input.participationScore !== undefined && report.status === "draft") {
        report.participationScore = input.participationScore;
        report.updatedAt = at;
      }
      // 학부모 알림 (출결) — 같은 회차에 한 번만
      if (!existing) {
        const student = w.students.find((s) => s.id === input.studentId);
        const label = input.status === "present" ? "출석했어요" : input.status === "late" ? `${lateMinutes}분 늦게 도착했어요` : "결석했어요";
        w.notifications.unshift({
          id: `ntf-att-${id}`,
          type: "attendance",
          title: `${student?.name ?? "학생"} 출결 확인`,
          body: `${rs.scheduledDate.slice(5).replace("-", "월 ")}일 ${rs.startTime} 수업에 ${label}.`,
          programRunId: rs.programRunId,
          studentId: input.studentId,
          createdAt: at,
          createdByUid: actorUid,
          recipients: student?.guardianUids.length ?? 0,
          readBy: [],
        });
      }
    }
  });
}
