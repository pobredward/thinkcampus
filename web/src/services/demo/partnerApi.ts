/**
 * 체험판 · 발주처 담당자 API — 달성군청 교육지원과 한지원 주무관
 * 실서비스 Functions(functions/src/partnerApi.ts)와 같은 응답을 만든다.
 *
 *   - 담당자는 배정된 운영 건(officers.programRunIds)만 본다
 *   - 민원은 원문 그대로 + 우리 처리 내용, 채팅 원문은 보이지 않는다 (문의는 건수 · 답변 수만)
 *   - 학생 이름은 운영 건 설정(partnerNameMasking)에 따라 "김○준"
 *   - 연락처 · 생년월일 · 등록코드는 어떤 경우에도 내보내지 않는다
 */

import { todayKey, WEEKDAYS } from "@/lib/dates";
import type { PartnerApi } from "@/services/api";
import type {
  AttendanceStatus,
  PartnerAccess,
  PartnerAttendanceRow,
  PartnerContact,
  PartnerInstructor,
  PartnerLesson,
  PartnerParticipation,
  PartnerReportData,
  PartnerRunOption,
} from "@/services/types";
import { inquiryStats, inquiryToDto, maskName } from "./chat";
import { activeEnrollments, campusName, delay, runById, runSummaryDto, sectionLabel, sessionTemplateOf, staffById, templateOf } from "./select";
import { surveyResults } from "./survey";
import { DEFAULT_CHAT_HOURS, DEMO_OFFICER, type DemoRun, type DemoWorld, getDemoWorld, mutateDemoWorld } from "./world";

function officerOf(w: DemoWorld, uid: string) {
  const o = w.officers.find((x) => x.uid === uid);
  if (!o) throw new Error("발주처 담당자 계정이 아니에요.");
  return o;
}

function assertRun(w: DemoWorld, uid: string, programRunId: string): DemoRun {
  const o = officerOf(w, uid);
  if (!o.programRunIds.includes(programRunId)) throw new Error("담당하는 운영 건이 아니에요.");
  return runById(w, programRunId);
}

/** 반 이름 묶음 — ["1반","2반","3반"] → "1~3반" */
function sectionRange(labels: string[]): string {
  const nums = labels.map((l) => Number(l.replace(/[^0-9]/g, ""))).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === labels.length && nums.length > 1) {
    const sorted = [...nums].sort((a, b) => a - b);
    const consecutive = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    if (consecutive) return `${sorted[0]}~${sorted[sorted.length - 1]}반`;
  }
  return labels.join("·");
}

export function partnerLessons(w: DemoWorld, run: DemoRun): PartnerLesson[] {
  const today = todayKey();
  const sessions = w.runSessions.filter((s) => s.programRunId === run.id && s.status !== "cancelled");
  const numbers = [...new Set(sessions.map((s) => s.sessionNumber))].sort((a, b) => a - b);
  return numbers.map((n) => {
    const list = sessions.filter((s) => s.sessionNumber === n).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.sectionId.localeCompare(b.sectionId));
    const date = list.map((s) => s.scheduledDate).sort()[0];
    const tpl = sessionTemplateOf(w, list[0]);
    const slotMap = new Map<string, string[]>();
    for (const s of list) {
      const key = `${s.startTime}–${s.endTime}`;
      slotMap.set(key, [...(slotMap.get(key) ?? []), sectionLabel(run, s.sectionId)]);
    }
    const instructorMap = new Map<string, string[]>();
    for (const s of list) {
      const name = staffById(w, s.instructorId)?.displayName ?? "배정 예정";
      instructorMap.set(name, [...(instructorMap.get(name) ?? []), sectionLabel(run, s.sectionId)]);
    }
    let enrolled = 0;
    let present = 0;
    let late = 0;
    let absent = 0;
    for (const s of list) {
      const enr = activeEnrollments(w, run.id, s.sectionId);
      enrolled += enr.length;
      const ids = new Set(enr.map((e) => e.studentId));
      for (const a of w.attendance) {
        if (a.runSessionId !== s.id || !ids.has(a.studentId)) continue;
        if (a.status === "present") present++;
        else if (a.status === "late") late++;
        else absent++;
      }
    }
    const recorded = present + late + absent;
    const status: PartnerLesson["status"] = date < today ? "done" : date === today ? "today" : "upcoming";
    const attendance: PartnerAttendanceRow = {
      sessionNumber: n,
      date,
      enrolled,
      present,
      late,
      absent,
      unrecorded: Math.max(0, enrolled - recorded),
      rate: recorded > 0 ? Math.round(((present + late) / recorded) * 1000) / 10 : null,
    };
    return {
      sessionNumber: n,
      date,
      slots: [...slotMap.entries()].map(([time, labels]) => (slotMap.size > 1 || run.sections.length > 1 ? `${time} (${sectionRange(labels)})` : time)),
      topic: list[0].topic,
      description: tpl?.description ?? "",
      objectives: tpl?.objectives ?? [],
      curriculum: tpl?.curriculum ?? [],
      materials: tpl?.materials ?? [],
      lessonCount: list[0].lessonCount,
      instructors: [...instructorMap.entries()].map(([name, sections]) => ({ name, sections })),
      status,
      attendance,
    };
  });
}

function overallRate(rows: PartnerAttendanceRow[]): number | null {
  const recorded = rows.reduce((n, r) => n + r.present + r.late + r.absent, 0);
  if (!recorded) return null;
  const ok = rows.reduce((n, r) => n + r.present + r.late, 0);
  return Math.round((ok / recorded) * 1000) / 10;
}

export function partnerParticipation(w: DemoWorld, run: DemoRun): PartnerParticipation {
  const today = todayKey();
  const lessons = partnerLessons(w, run);
  const masked = !!run.partnerNameMasking;
  const enr = activeEnrollments(w, run.id).length ? activeEnrollments(w, run.id) : w.enrollments.filter((e) => e.programRunId === run.id);
  const rsBySection = new Map<string, Map<number, string>>();
  for (const s of w.runSessions.filter((x) => x.programRunId === run.id)) {
    const m = rsBySection.get(s.sectionId) ?? new Map<number, string>();
    m.set(s.sessionNumber, s.id);
    rsBySection.set(s.sectionId, m);
  }
  const students = enr
    .map((e) => {
      const st = w.students.find((s) => s.id === e.studentId);
      const statuses: Array<AttendanceStatus | null> = lessons.map((l) => {
        const rsId = rsBySection.get(e.sectionId)?.get(l.sessionNumber);
        return w.attendance.find((a) => a.runSessionId === rsId && a.studentId === e.studentId)?.status ?? null;
      });
      return {
        studentId: e.studentId,
        name: st ? (masked ? maskName(st.name) : st.name) : e.studentId,
        sectionLabel: sectionLabel(run, e.sectionId),
        statuses,
        present: statuses.filter((x) => x === "present").length,
        late: statuses.filter((x) => x === "late").length,
        absent: statuses.filter((x) => x === "absent").length,
      };
    })
    .sort((a, b) => a.sectionLabel.localeCompare(b.sectionLabel, "ko", { numeric: true }) || a.name.localeCompare(b.name, "ko"));
  const sections = [...run.sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((sec) => {
      const rows = students.filter((s) => s.sectionLabel === sec.label);
      const rec = rows.reduce((n, r) => n + r.present + r.late + r.absent, 0);
      const ok = rows.reduce((n, r) => n + r.present + r.late, 0);
      return { id: sec.id, label: sec.label, studentCount: rows.length, rate: rec ? Math.round((ok / rec) * 1000) / 10 : null };
    });
  return {
    sessions: lessons.map((l) => ({ sessionNumber: l.sessionNumber, date: l.date, done: l.date <= today && l.attendance.present + l.attendance.late + l.attendance.absent > 0 })),
    sections,
    students,
    masked,
  };
}

export function partnerInstructors(w: DemoWorld, run: DemoRun): { instructors: PartnerInstructor[]; contact: PartnerContact } {
  const sessions = w.runSessions.filter((s) => s.programRunId === run.id && s.status !== "cancelled" && s.instructorId);
  const byStaff = new Map<string, typeof sessions>();
  for (const s of sessions) byStaff.set(s.instructorId!, [...(byStaff.get(s.instructorId!) ?? []), s]);
  const instructors: PartnerInstructor[] = [...byStaff.entries()]
    .map(([uid, list]) => {
      const st = staffById(w, uid);
      return {
        staffId: uid,
        name: st?.displayName ?? uid,
        title: st?.title,
        bio: st?.bio,
        specialties: st?.specialties ?? [],
        sessions: list
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime))
          .map((s) => ({ sessionNumber: s.sessionNumber, date: s.scheduledDate, sectionLabel: sectionLabel(run, s.sectionId), topic: s.topic })),
      };
    })
    .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name, "ko"));
  const campus = w.campuses.find((c) => c.id === run.campusId);
  const manager = w.staff.find((s) => s.role === "centerAdmin" && s.campusIds.includes(run.campusId));
  return {
    instructors,
    contact: {
      campusName: campus?.name ?? run.campusId,
      address: campus?.address,
      managerName: manager?.displayName ?? "캠퍼스 담당",
      managerRole: "프로그램 매니저",
      phone: campus?.phone,
      hours: campus?.chatHours ?? DEFAULT_CHAT_HOURS,
    },
  };
}

function scheduleLine(run: DemoRun, lessons: PartnerLesson[]): string {
  const freq = run.frequency === "weekly" ? "매주" : "격주";
  const slots = [...new Set(lessons.flatMap((l) => l.slots))];
  return `${freq} ${WEEKDAYS[run.fixedDay]}요일 · ${slots.join(" / ") || `${run.startTime}–${run.endTime}`}`;
}

export function partnerReportData(w: DemoWorld, run: DemoRun): PartnerReportData {
  const tpl = templateOf(w, run);
  const lessons = partnerLessons(w, run);
  const participation = partnerParticipation(w, run);
  const { instructors, contact } = partnerInstructors(w, run);
  const rows = lessons.map((l) => l.attendance);
  const masked = !!run.partnerNameMasking;
  const qs = w.inquiries.filter((q) => q.programRunId === run.id);
  const finals = w.finalReports.filter((r) => r.programRunId === run.id);
  const grades = { S: 0, A: 0, B: 0, C: 0 };
  const strengths = new Map<string, number>();
  for (const f of finals) {
    grades[f.totalGrade]++;
    for (const s of f.strengthAreas) strengths.set(s, (strengths.get(s) ?? 0) + 1);
  }
  const lessonsPerSession = lessons[0]?.lessonCount ?? tpl.sessions[0]?.lessonCount ?? 3;
  return {
    generatedAt: new Date().toISOString(),
    run: {
      id: run.id,
      title: run.title,
      contractCode: run.contractCode,
      municipalityName: run.municipalityName,
      host: run.host,
      campusName: campusName(w, run.campusId),
      location: run.location,
      targetGrade: tpl.targetGrade,
      startDate: run.startDate,
      endDate: run.endDate,
      scheduleLine: scheduleLine(run, lessons),
      totalSessions: lessons.length,
      lessonsPerSession,
      minutesPerLesson: 40,
      sections: run.sections.map((s) => ({ label: s.label, studentCount: activeEnrollments(w, run.id, s.id).length || w.enrollments.filter((e) => e.programRunId === run.id && e.sectionId === s.id).length })),
      studentCount: participation.students.length,
      purpose: tpl.purpose ?? "",
      overview: tpl.overview ?? "",
      features: tpl.features ?? [],
    },
    lessons,
    instructors,
    contact,
    participation,
    attendanceRows: rows,
    overallAttendanceRate: overallRate(rows),
    inquiries: {
      stats: inquiryStats(w, run.id),
      complaints: qs.filter((q) => q.kind === "complaint").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((q) => inquiryToDto(w, q, { mask: masked })),
      loggedQuestions: qs.filter((q) => q.kind === "question").sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((q) => inquiryToDto(w, q, { mask: masked })),
    },
    survey: surveyResults(w, run.id, { publicOnly: true, mask: true }),
    notices: w.notifications
      .filter((n) => n.programRunId === run.id && n.type === "notice")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((n) => ({ title: n.title, createdAt: n.createdAt, recipients: n.recipients })),
    finalReports: finals.length
      ? {
          issued: finals.length,
          students: participation.students.length,
          grades,
          topStrengths: [...strengths.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count })),
        }
      : null,
  };
}

export function createDemoPartnerApi(uid: string = DEMO_OFFICER.uid): PartnerApi {
  return {
    async getAccess(): Promise<PartnerAccess> {
      const w = getDemoWorld();
      const o = w.officers.find((x) => x.uid === uid);
      if (!o) return delay({ allowed: false, uid, displayName: "", organization: "", programRunIds: [], mustChangePassword: false });
      return delay({
        allowed: true,
        uid,
        displayName: o.displayName,
        email: o.email,
        organization: o.organization,
        title: o.title,
        programRunIds: o.programRunIds,
        mustChangePassword: false, // 체험판은 비밀번호 변경 단계를 건너뛴다
      });
    },

    async completePasswordChange() {
      mutateDemoWorld((w) => {
        const o = w.officers.find((x) => x.uid === uid);
        if (o) o.mustChangePassword = false;
      });
    },

    async listRuns(): Promise<PartnerRunOption[]> {
      const w = getDemoWorld();
      const o = officerOf(w, uid);
      const order = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 } as const;
      return delay(
        o.programRunIds
          .map((id) => runById(w, id))
          .sort((a, b) => order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate))
          .map((r) => ({
            id: r.id,
            title: r.title,
            contractCode: r.contractCode,
            campusName: campusName(w, r.campusId),
            municipalityName: r.municipalityName,
            status: r.status,
            startDate: r.startDate,
            endDate: r.endDate,
          })),
      );
    },

    async getHome(programRunId) {
      const w = getDemoWorld();
      const run = assertRun(w, uid, programRunId);
      const lessons = partnerLessons(w, run);
      const rows = lessons.map((l) => l.attendance);
      const done = lessons.filter((l) => l.status === "done" || (l.status === "today" && l.attendance.present + l.attendance.late + l.attendance.absent > 0)).length;
      const next = lessons.find((l) => l.status === "upcoming" || (l.status === "today" && l.attendance.unrecorded > 0)) ?? null;
      const masked = !!run.partnerNameMasking;
      const survey = surveyResults(w, programRunId, { publicOnly: true, mask: true });
      return delay({
        run: runSummaryDto(w, run),
        host: run.host,
        progress: { done, total: lessons.length, nextDate: next?.date ?? null },
        attendance: { rate: overallRate(rows), rows },
        inquiryStats: inquiryStats(w, programRunId),
        nextLesson: next,
        recentComplaints: w.inquiries
          .filter((q) => q.programRunId === programRunId && q.kind === "complaint")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 3)
          .map((q) => inquiryToDto(w, q, { mask: masked })),
        recentNotices: w.notifications
          .filter((n) => n.programRunId === programRunId && n.type === "notice")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 3)
          .map((n) => ({ id: n.id, title: n.title, createdAt: n.createdAt, recipients: n.recipients })),
        survey: survey ? { title: survey.title, status: survey.status, responses: survey.responses, eligible: survey.eligible, overallAvg: survey.overallAvg } : null,
      });
    },

    async listLessons(programRunId) {
      const w = getDemoWorld();
      return delay(partnerLessons(w, assertRun(w, uid, programRunId)));
    },

    async listInquiries(programRunId) {
      const w = getDemoWorld();
      const run = assertRun(w, uid, programRunId);
      const masked = !!run.partnerNameMasking;
      const qs = w.inquiries.filter((q) => q.programRunId === programRunId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return delay({
        stats: inquiryStats(w, programRunId),
        complaints: qs.filter((q) => q.kind === "complaint").map((q) => inquiryToDto(w, q, { mask: masked })),
        loggedQuestions: qs.filter((q) => q.kind === "question").map((q) => inquiryToDto(w, q, { mask: masked })),
      });
    },

    async setOfficerNote(inquiryId, note) {
      mutateDemoWorld((w) => {
        const q = w.inquiries.find((x) => x.id === inquiryId);
        if (!q) throw new Error("민원을 찾을 수 없어요.");
        assertRun(w, uid, q.programRunId);
        q.officerNote = note.trim().slice(0, 500) || undefined;
      });
      await delay(undefined, 150);
    },

    async getParticipation(programRunId) {
      const w = getDemoWorld();
      return delay(partnerParticipation(w, assertRun(w, uid, programRunId)));
    },

    async getSurveyResults(programRunId) {
      const w = getDemoWorld();
      assertRun(w, uid, programRunId);
      return delay(surveyResults(w, programRunId, { publicOnly: true, mask: true }));
    },

    async listInstructors(programRunId) {
      const w = getDemoWorld();
      return delay(partnerInstructors(w, assertRun(w, uid, programRunId)));
    },

    async getReportData(programRunId) {
      const w = getDemoWorld();
      return delay(partnerReportData(w, assertRun(w, uid, programRunId)), 250);
    },
  };
}
