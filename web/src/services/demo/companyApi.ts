/**
 * 체험판 · 통합 관리자(회사) API — 김도현 (전체 캠퍼스)
 */

import { todayKey } from "@/lib/dates";
import type { CompanyApi } from "@/services/api";
import type { CampusDto, CompanyHome, OfficerDto, ProgramRunDetail, ProgramTemplateDto, RosterImportResult, StaffDto } from "@/services/types";
import { inquiryToDto } from "./chat";
import { applyReportReview, listReportRows } from "./reports";
import { activeEnrollments, delay, instructorName, runById, runSummaryDto, sectionLabel, templateOf } from "./select";
import { surveyResults } from "./survey";
import { DEFAULT_SURVEY_ITEMS, type DemoRun, type DemoWorld, getDemoWorld, mutateDemoWorld, nowIso } from "./world";

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function campusDtos(w: DemoWorld): CampusDto[] {
  return w.campuses.map((c) => {
    const runs = w.runs.filter((r) => r.campusId === c.id && r.status !== "completed" && r.status !== "cancelled");
    const studentCount = new Set(runs.flatMap((r) => activeEnrollments(w, r.id).map((e) => e.studentId))).size;
    return { id: c.id, name: c.name, municipalityName: c.municipalityName, address: c.address, runCount: runs.length, studentCount };
  });
}

function stableStudentId(campusId: string, birthDate: string, name: string, externalId?: string): string {
  if (externalId?.trim()) return `stu_${campusId}_${externalId.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)}`;
  const key = `${campusId}|${birthDate}|${name}`;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `stu_${h.toString(16).padStart(8, "0")}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(campusId: string): string {
  const prefix = campusId.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "TC";
  let s = "";
  for (let i = 0; i < 5; i++) s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `${prefix}-${s}`;
}

export function createDemoCompanyApi(actorUid: string): CompanyApi {
  return {
    async getHome(): Promise<CompanyHome> {
      const w = getDemoWorld();
      const order = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 } as const;
      const runs = [...w.runs].sort((a, b) => order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate)).map((r) => runSummaryDto(w, r));
      const openRuns = w.runs.filter((r) => r.status === "active" || r.status === "scheduled");
      const totalStudents = new Set(openRuns.flatMap((r) => activeEnrollments(w, r.id).map((e) => e.studentId))).size;
      const last = [...w.imports].sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
      const awaiting = w.reports.filter((r) => r.status === "reviewed" && runById(w, r.programRunId).reportPolicy.requireCompanyApproval).length;
      const complaintsOpen = w.inquiries.filter((q) => q.kind === "complaint" && q.status !== "resolved").length;
      return delay({ runs, campuses: campusDtos(w), totalStudents, lastImport: last, reportsAwaitingApproval: awaiting, complaintsOpen });
    },

    async listRuns() {
      const w = getDemoWorld();
      const order = { active: 0, scheduled: 1, draft: 2, completed: 3, cancelled: 4 } as const;
      return delay([...w.runs].sort((a, b) => order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate)).map((r) => runSummaryDto(w, r)));
    },

    async getRun(programRunId): Promise<ProgramRunDetail> {
      const w = getDemoWorld();
      const run = runById(w, programRunId);
      const tpl = templateOf(w, run);
      const sessions = w.runSessions
        .filter((s) => s.programRunId === run.id)
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
          instructorName: instructorName(w, s.instructorId),
          status: s.status,
        }));
      const counts = new Map<string, number>();
      for (const s of w.runSessions) if (s.programRunId === run.id && s.instructorId) counts.set(s.instructorId, (counts.get(s.instructorId) ?? 0) + 1);
      const enrolled = activeEnrollments(w, run.id);
      const ids = new Set(enrolled.map((e) => e.studentId));
      const linked = w.students.filter((s) => ids.has(s.id) && s.guardianUids.length > 0).length;
      const att = w.attendance.filter((a) => a.programRunId === run.id);
      const attendanceRate = att.length ? Math.round((att.filter((a) => a.status !== "absent").length / att.length) * 100) : null;
      return delay({
        ...runSummaryDto(w, run),
        host: run.host,
        mapQuery: run.mapQuery,
        programTemplateId: tpl.id,
        programTemplateTitle: tpl.title,
        sessions,
        instructors: [...counts.entries()].map(([staffId, sessionCount]) => ({ staffId, name: instructorName(w, staffId) ?? staffId, sessionCount })),
        guardianLinkedCount: linked,
        attendanceRate,
        createdAt: run.createdAt,
        partnerNameMasking: !!run.partnerNameMasking,
      });
    },

    async listTemplates(): Promise<ProgramTemplateDto[]> {
      const w = getDemoWorld();
      return delay(
        w.templates.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: t.subtitle,
          category: t.category,
          defaultSessionCount: t.sessions.length,
          defaultLessonCount: t.sessions[0]?.lessonCount ?? 3,
          defaultFrequency: t.defaultFrequency,
          defaultFixedDay: t.defaultFixedDay,
          defaultStartTime: t.defaultStartTime,
          defaultEndTime: t.defaultEndTime,
          sessions: t.sessions.map((s) => ({ id: s.id, order: s.order, topic: s.topic, lessonCount: s.lessonCount })),
        })),
      );
    },

    async listCampuses() {
      return delay(campusDtos(getDemoWorld()));
    },

    async createRun(input) {
      let result = { programRunId: "", contractCode: "", runSessionCount: 0 };
      mutateDemoWorld((w) => {
        const contractCode = input.contractCode.trim();
        if (!contractCode) throw new Error("계약 코드를 입력해 주세요.");
        if (w.runs.some((r) => r.contractCode === contractCode)) throw new Error(`이미 있는 계약 코드예요: ${contractCode}`);
        const tpl = w.templates.find((t) => t.id === input.programTemplateId);
        if (!tpl) throw new Error("프로그램 템플릿을 선택해 주세요.");
        if (!w.campuses.some((c) => c.id === input.campusId)) throw new Error("캠퍼스를 선택해 주세요.");
        if (!input.sessionPlan.length) throw new Error("회차를 한 개 이상 배치해 주세요.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) throw new Error("시작일을 YYYY-MM-DD 로 입력해 주세요.");
        const sections = (input.sections.length ? input.sections : [{ id: "sec-1", label: "1반" }]).map((s, i) => ({
          id: s.id || `sec-${i + 1}`,
          label: s.label.trim() || `${i + 1}반`,
          sortOrder: i + 1,
        }));
        const id = `run-${contractCode.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-")}`;
        const step = input.frequency === "biweekly" ? 14 : 7;
        // 시작일부터 고정 요일에 맞춰 회차 날짜 생성 (제외일은 건너뛴다)
        const excluded = new Set(input.excludedDates ?? []);
        const dates: string[] = [];
        let cursor = input.startDate;
        const [y, m, d] = cursor.split("-").map(Number);
        const startDow = new Date(y, m - 1, d).getDay();
        if (startDow !== input.fixedDay) cursor = addDays(cursor, (input.fixedDay - startDow + 7) % 7);
        while (dates.length < input.sessionPlan.length && dates.length < 60) {
          if (!excluded.has(cursor)) dates.push(cursor);
          cursor = addDays(cursor, step);
        }
        const run: DemoRun = {
          id,
          contractCode,
          programTemplateId: tpl.id,
          title: input.title?.trim() || `${input.municipalityName} ${tpl.title}`,
          campusId: input.campusId,
          municipalityName: input.municipalityName.trim(),
          status: input.startDate <= todayKey() ? "active" : "scheduled",
          startDate: dates[0] ?? input.startDate,
          endDate: input.endDate ?? dates[dates.length - 1] ?? input.startDate,
          frequency: input.frequency,
          fixedDay: input.fixedDay,
          startTime: input.startTime,
          endTime: input.endTime,
          location: input.location.trim(),
          host: input.host,
          sections,
          reportPolicy: input.reportPolicy,
          createdAt: nowIso(),
        };
        w.runs.push(run);
        let count = 0;
        input.sessionPlan.forEach((plan, i) => {
          const date = dates[i];
          if (!date) return;
          for (const section of sections) {
            w.runSessions.push({
              id: `rs-${id.replace(/^run-/, "")}-${String(i + 1).padStart(2, "0")}-${section.id}`,
              programRunId: id,
              sessionNumber: i + 1,
              sessionTemplateId: plan.sessionTemplateId,
              sectionId: section.id,
              instructorId: null,
              scheduledDate: date,
              startTime: input.startTime,
              endTime: input.endTime,
              lessonCount: plan.lessonCount || input.defaultLessonCount,
              topic: plan.topic,
              location: run.location,
              status: "scheduled",
            });
            count++;
          }
        });
        result = { programRunId: id, contractCode, runSessionCount: count };
      });
      return delay(result, 300);
    },

    async updateRunPolicy(programRunId, policy) {
      mutateDemoWorld((w) => {
        runById(w, programRunId).reportPolicy = { requireCompanyApproval: policy.requireCompanyApproval };
      });
      await delay(undefined, 150);
    },

    async importRoster(rows, dryRun): Promise<RosterImportResult> {
      const w = getDemoWorld();
      const errors: RosterImportResult["errors"] = [];
      const previews: RosterImportResult["previews"] = [];
      const plan: Array<{
        rowIndex: number;
        studentId: string;
        name: string;
        birthDate: string;
        campusId: string;
        householdId: string;
        run: DemoRun;
        sectionId: string;
        code: string;
        isNewStudent: boolean;
        isNewEnrollment: boolean;
      }> = [];
      const householdByKey = new Map<string, string>();
      rows.forEach((row, rowIndex) => {
        const name = row.studentName?.trim();
        const birth = (row.birthDate ?? "").replace(/\D/g, "");
        const contractCode = row.contractCode?.trim();
        const campusId = row.campusId?.trim();
        if (!name) return errors.push({ rowIndex, message: "학생명이 비어 있어요." });
        if (birth.length !== 8) return errors.push({ rowIndex, message: `생년월일 8자리가 필요해요: ${row.birthDate ?? ""}` });
        if (!contractCode) return errors.push({ rowIndex, message: "운영 건 코드가 비어 있어요." });
        const run = w.runs.find((r) => r.contractCode === contractCode);
        if (!run) return errors.push({ rowIndex, message: `운영 건을 찾을 수 없어요: ${contractCode}` });
        if (!campusId) return errors.push({ rowIndex, message: "캠퍼스 ID 가 비어 있어요." });
        if (run.campusId !== campusId) return errors.push({ rowIndex, message: `캠퍼스(${campusId})가 운영 건 캠퍼스(${run.campusId})와 달라요.` });
        let sectionId = run.sections[0]?.id ?? "_unassigned";
        if (row.sectionLabel?.trim()) {
          const sec = run.sections.find((s) => s.label === row.sectionLabel!.trim());
          if (!sec) return errors.push({ rowIndex, message: `반을 찾을 수 없어요: ${row.sectionLabel}` });
          sectionId = sec.id;
        }
        const studentId = stableStudentId(campusId, birth, name, row.externalStudentId);
        const existing = w.students.find((s) => s.id === studentId);
        const hhKey = row.householdKey?.trim() || (row.guardianPhone ?? "").replace(/\D/g, "") || "";
        let householdId = existing?.householdId ?? "";
        if (!householdId) {
          if (hhKey) {
            householdId = householdByKey.get(hhKey) ?? `hh_${hhKey.slice(-6)}_${campusId}`;
            householdByKey.set(hhKey, householdId);
          } else householdId = `hh_${studentId}`;
        }
        const isNewEnrollment = !w.enrollments.some((e) => e.studentId === studentId && e.programRunId === run.id);
        const code = w.enrollmentCodes.find((c) => c.studentId === studentId && c.programRunId === run.id)?.code ?? randomCode(campusId);
        plan.push({ rowIndex, studentId, name, birthDate: birth, campusId, householdId, run, sectionId, code, isNewStudent: !existing, isNewEnrollment });
        previews.push({ rowIndex, studentName: name, householdId, enrollmentCode: code, contractCode, sectionLabel: sectionLabel(run, sectionId) });
      });

      const result: RosterImportResult = {
        dryRun,
        rowCount: rows.length,
        createdStudents: plan.filter((p) => p.isNewStudent).length,
        updatedStudents: plan.filter((p) => !p.isNewStudent).length,
        createdProgramEnrollments: plan.filter((p) => p.isNewEnrollment).length,
        createdEnrollmentCodes: plan.filter((p) => p.isNewEnrollment).length,
        previews,
        errors,
      };
      if (dryRun || errors.length > 0) return delay(result, 300);

      mutateDemoWorld((world) => {
        for (const p of plan) {
          if (p.isNewStudent) {
            world.students.push({ id: p.studentId, name: p.name, birthDate: p.birthDate, campusId: p.campusId, householdId: p.householdId, guardianUids: [], allowedGuardianPhones: [] });
          }
          if (p.isNewEnrollment) {
            world.enrollments.push({
              id: `enr-${p.run.id.replace(/^run-/, "")}-${p.studentId}`,
              studentId: p.studentId,
              programRunId: p.run.id,
              sectionId: p.sectionId,
              status: p.run.status === "scheduled" ? "upcoming" : "active",
              enrolledAt: nowIso(),
            });
            world.enrollmentCodes.push({ code: p.code, studentId: p.studentId, campusId: p.campusId, programRunId: p.run.id, status: "unused" });
          }
        }
        world.imports.unshift({ at: nowIso(), rowCount: rows.length, contractCode: plan[0]?.run.contractCode ?? "" });
      });
      return delay(result, 400);
    },

    async listStaff(): Promise<StaffDto[]> {
      const w = getDemoWorld();
      return delay(
        w.staff.map((s) => ({ uid: s.uid, displayName: s.displayName, email: s.email, phone: s.phone, role: s.role, campusIds: s.campusIds })),
      );
    },

    async listReports(filter) {
      return delay(listReportRows(getDemoWorld(), filter, () => true));
    },

    async reviewReports(reportIds, action, note) {
      mutateDemoWorld((w) => applyReportReview(w, reportIds, action, note, "company", actorUid));
      await delay(undefined, 200);
    },

    // ── 민원 (모든 캠퍼스) ──
    async listInquiries(filter) {
      const w = getDemoWorld();
      return delay(
        w.inquiries
          .filter((q) => !filter.programRunId || q.programRunId === filter.programRunId)
          .filter((q) => !filter.kind || q.kind === filter.kind)
          .filter((q) => !filter.status || (filter.status === "open" ? q.status !== "resolved" : q.status === filter.status))
          .sort((a, b) => (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0) || b.createdAt.localeCompare(a.createdAt))
          .map((q) => inquiryToDto(w, q)),
      );
    },

    // ── 발주처 담당자 계정 ──
    async listOfficers(programRunId) {
      const w = getDemoWorld();
      runById(w, programRunId);
      const list: OfficerDto[] = w.officers
        .filter((o) => o.programRunIds.includes(programRunId))
        .map((o) => ({ ...o }))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "ko"));
      return delay(list);
    },

    async inviteOfficer(input) {
      const email = input.email.trim().toLowerCase();
      const displayName = input.displayName.trim();
      const organization = input.organization.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("이메일 주소를 확인해 주세요.");
      if (!displayName) throw new Error("담당자 이름을 입력해 주세요.");
      if (!organization) throw new Error("소속(기관 · 부서)을 입력해 주세요.");
      let result = { uid: "", email, tempPassword: null as string | null };
      mutateDemoWorld((w) => {
        runById(w, input.programRunId);
        const existing = w.officers.find((o) => o.email === email);
        if (existing) {
          if (!existing.programRunIds.includes(input.programRunId)) existing.programRunIds.push(input.programRunId);
          result = { uid: existing.uid, email, tempPassword: null };
          return;
        }
        const uid = `demo-officer-${Date.now().toString(36)}`;
        const tempPassword = `Tc-${Math.random().toString(36).slice(2, 6)}${Math.floor(1000 + Math.random() * 9000)}`;
        w.officers.push({
          uid,
          displayName,
          email,
          organization,
          title: input.title?.trim() || undefined,
          phone: input.phone?.trim() || undefined,
          programRunIds: [input.programRunId],
          mustChangePassword: true,
          createdAt: nowIso(),
        });
        result = { uid, email, tempPassword };
      });
      return delay(result, 300);
    },

    async revokeOfficer(uid, programRunId) {
      mutateDemoWorld((w) => {
        const o = w.officers.find((x) => x.uid === uid);
        if (!o) throw new Error("담당자를 찾을 수 없어요.");
        o.programRunIds = o.programRunIds.filter((id) => id !== programRunId);
        if (o.programRunIds.length === 0 && o.uid !== "demo-officer-dalseong") w.officers = w.officers.filter((x) => x.uid !== uid);
      });
      await delay(undefined, 200);
    },

    async updatePartnerSettings(programRunId, settings) {
      mutateDemoWorld((w) => {
        runById(w, programRunId).partnerNameMasking = settings.nameMasking;
      });
      await delay(undefined, 150);
    },

    // ── 만족도 조사 ──
    async getSurveyResults(programRunId) {
      const w = getDemoWorld();
      runById(w, programRunId);
      return delay(surveyResults(w, programRunId, { publicOnly: false, mask: false }));
    },

    async upsertSurvey(input) {
      const opens = new Date(input.opensAt);
      const closes = new Date(input.closesAt);
      if (Number.isNaN(opens.getTime()) || Number.isNaN(closes.getTime()) || closes <= opens) throw new Error("기간이 올바르지 않아요.");
      mutateDemoWorld((w) => {
        const run = runById(w, input.programRunId);
        const existing = w.surveys.find((s) => s.programRunId === run.id);
        if (existing) {
          existing.opensAt = input.opensAt;
          existing.closesAt = input.closesAt;
          if (input.title?.trim()) existing.title = input.title.trim();
          return;
        }
        w.surveys.push({
          programRunId: run.id,
          title: input.title?.trim() || `${run.title} 만족도 조사`,
          intro: "아이의 수업 경험을 들려주세요. 1분이면 끝나요.",
          items: DEFAULT_SURVEY_ITEMS,
          allowReview: true,
          consentLabel: "후기를 사업 발주 기관(지자체)과 다른 학부모에게 공개해도 좋아요 (이름은 가려져요)",
          opensAt: input.opensAt,
          closesAt: input.closesAt,
        });
      });
      await delay(undefined, 200);
    },
  };
}
