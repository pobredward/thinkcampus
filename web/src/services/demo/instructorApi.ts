/**
 * 체험판 · 강사 API — 박지훈 (달성캠퍼스 1반 · 4반 담당)
 */

import { todayKey } from "@/lib/dates";
import type { InstructorApi } from "@/services/api";
import type { InstructorHome, InstructorRosterEntry, InstructorSessionWorkspace, LessonMaterialDto } from "@/services/types";
import { recordAttendanceInWorld } from "./centerApi";
import { activeEnrollments, campusName, delay, instructorSessionDto, runById, runSessionById, sessionTemplateOf, staffById, templateOf } from "./select";
import { getDemoWorld, mutateDemoWorld, nowIso, type DemoWorld } from "./world";

function scheduleLine(run: { frequency: "weekly" | "biweekly"; fixedDay: number }, times: string[]): string {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${run.frequency === "biweekly" ? "격주" : "매주"} ${days[run.fixedDay]}요일 · ${times.join(" · ")}`;
}

function mySessions(w: DemoWorld, uid: string) {
  return w.runSessions
    .filter((s) => s.instructorId === uid && s.status !== "cancelled")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime) || a.sectionId.localeCompare(b.sectionId));
}

export function createDemoInstructorApi(uid: string): InstructorApi {
  const assertMine = (w: DemoWorld, runSessionId: string) => {
    const rs = runSessionById(w, runSessionId);
    if (rs.instructorId !== uid) throw new Error("담당 회차가 아닙니다.");
    return rs;
  };

  return {
    async getHome(): Promise<InstructorHome> {
      const w = getDemoWorld();
      const today = todayKey();
      const all = mySessions(w, uid);
      const runIds = [...new Set(all.map((s) => s.programRunId))];
      const home: InstructorHome = {
        displayName: staffById(w, uid)?.displayName ?? "강사",
        today,
        todaySessions: all.filter((s) => s.scheduledDate === today).map((s) => instructorSessionDto(w, s)),
        upcoming: all
          .filter((s) => s.scheduledDate > today)
          .slice(0, 6)
          .map((s) => instructorSessionDto(w, s)),
        runs: runIds.map((id) => {
          const run = runById(w, id);
          const mine = all.filter((s) => s.programRunId === id);
          const times = [...new Set(mine.map((s) => `${s.startTime}–${s.endTime}`))].sort();
          return {
            programRunId: id,
            contractCode: run.contractCode,
            title: run.title,
            campusName: campusName(w, run.campusId),
            scheduleLine: scheduleLine(run, times),
            mySessions: mine.length,
          };
        }),
      };
      return delay(home);
    },

    async listSessions() {
      const w = getDemoWorld();
      return delay(mySessions(w, uid).map((s) => instructorSessionDto(w, s)));
    },

    async getSessionWorkspace(runSessionId): Promise<InstructorSessionWorkspace> {
      const w = getDemoWorld();
      const rs = assertMine(w, runSessionId);
      const run = runById(w, rs.programRunId);
      const ts = sessionTemplateOf(w, rs);
      const tpl = templateOf(w, run);
      const roster: InstructorRosterEntry[] = activeEnrollments(w, rs.programRunId, rs.sectionId)
        .map((e) => {
          const s = w.students.find((x) => x.id === e.studentId)!;
          const att = w.attendance.find((a) => a.id === `${rs.id}__${s.id}`);
          const r = w.reports.find((x) => x.id === `${rs.id}__${s.id}`);
          return {
            studentId: s.id,
            name: s.name,
            photoUrl: s.photoUrl,
            attendance: att?.status,
            lateMinutes: att?.lateMinutes,
            report: {
              status: r?.status ?? "draft",
              participationScore: r?.participationScore ?? null,
              homeworkDone: r?.homeworkDone ?? null,
              feedback: r?.feedback ?? "",
              highlights: r?.highlights ?? [],
              improvements: r?.improvements ?? [],
              returnNote: r?.returnNote,
            },
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
      const same = w.runSessions
        .filter((s) => s.programRunId === rs.programRunId && s.sectionId === rs.sectionId)
        .sort((a, b) => a.sessionNumber - b.sessionNumber);
      const idx = same.findIndex((s) => s.id === rs.id);
      const lessonMaterials: LessonMaterialDto[] = (ts?.lessonPlans ?? []).map((lp) => ({
        lessonCode: `${ts?.programCode ?? tpl.id.toUpperCase()}-L${lp.lessonNumber}`,
        title: lp.topic,
        planUrl: ts?.planUrl,
        slideViewUrl: lp.slideUrl,
        activityUrl: lp.activityUrl,
      }));
      return delay({
        session: instructorSessionDto(w, rs),
        plan: {
          description: ts?.description ?? "",
          objectives: ts?.objectives ?? [],
          teachingMethod: ts?.teachingMethod,
          curriculum: ts?.curriculum ?? [],
          materials: ts?.materials ?? [],
          rotationNote: ts?.rotationNote,
        },
        lessonMaterials,
        roster,
        prevSessionId: idx > 0 ? same[idx - 1].id : null,
        nextSessionId: idx >= 0 && idx < same.length - 1 ? same[idx + 1].id : null,
      });
    },

    async recordAttendance(inputs) {
      const w = getDemoWorld();
      for (const i of inputs) assertMine(w, i.runSessionId);
      recordAttendanceInWorld(inputs, uid, null);
      await delay(undefined, 150);
    },

    async saveReportDrafts(inputs) {
      mutateDemoWorld((w) => {
        const at = nowIso();
        for (const input of inputs) {
          const rs = assertMine(w, input.runSessionId);
          const id = `${rs.id}__${input.studentId}`;
          let r = w.reports.find((x) => x.id === id);
          if (r && r.status !== "draft") throw new Error("이미 제출한 리포트는 센터가 반려한 뒤에만 고칠 수 있어요.");
          if (!r) {
            r = {
              id,
              runSessionId: rs.id,
              programRunId: rs.programRunId,
              studentId: input.studentId,
              instructorId: uid,
              status: "draft",
              participationScore: null,
              homeworkDone: null,
              feedback: "",
              highlights: [],
              improvements: [],
              updatedAt: at,
            };
            w.reports.push(r);
          }
          r.participationScore = input.participationScore;
          r.homeworkDone = input.homeworkDone;
          r.feedback = input.feedback.trim();
          r.highlights = input.highlights.map((h) => h.trim()).filter(Boolean);
          r.improvements = input.improvements.map((h) => h.trim()).filter(Boolean);
          r.instructorId = uid;
          r.updatedAt = at;
        }
      });
      await delay(undefined, 150);
    },

    async submitReports(runSessionId) {
      let submitted = 0;
      mutateDemoWorld((w) => {
        const rs = assertMine(w, runSessionId);
        const at = nowIso();
        const attended = new Set(w.attendance.filter((a) => a.runSessionId === rs.id).map((a) => a.studentId));
        if (attended.size === 0) throw new Error("출결을 먼저 입력해 주세요.");
        for (const r of w.reports) {
          if (r.runSessionId !== rs.id || r.status !== "draft" || !attended.has(r.studentId)) continue;
          const att = w.attendance.find((a) => a.id === r.id)!;
          if (att.status !== "absent" && !r.feedback.trim()) {
            const name = w.students.find((s) => s.id === r.studentId)?.name ?? r.studentId;
            throw new Error(`${name} 학생의 피드백을 입력해 주세요.`);
          }
          r.status = "submitted";
          r.submittedAt = at;
          r.returnNote = undefined;
          r.updatedAt = at;
          submitted++;
        }
        if (submitted === 0) throw new Error("제출할 리포트가 없어요.");
      });
      return delay({ submitted }, 250);
    },
  };
}
