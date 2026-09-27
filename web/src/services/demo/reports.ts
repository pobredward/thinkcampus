/**
 * 회차 리포트 — 목록 조회와 검수(상태 전환). 센터·회사 API 가 같이 쓴다.
 *
 *   draft(작성 중) → submitted(검수 대기) → [reviewed(승인 대기)] → published(학부모 공개)
 *   return 은 어느 단계에서든 draft 로 되돌리고 반려 사유를 남긴다.
 */

import type { ReportReviewAction, SessionReportFilter, SessionReportRow } from "@/services/types";
import { reportRow, runById } from "./select";
import type { DemoRun, DemoWorld } from "./world";
import { nowIso } from "./world";

export function listReportRows(w: DemoWorld, filter: SessionReportFilter, allowRun: (run: DemoRun) => boolean): SessionReportRow[] {
  const rows: SessionReportRow[] = [];
  for (const r of w.reports) {
    if (filter.programRunId && r.programRunId !== filter.programRunId) continue;
    if (filter.runSessionId && r.runSessionId !== filter.runSessionId) continue;
    const run = runById(w, r.programRunId);
    if (!allowRun(run)) continue;
    if (filter.status === "pending") {
      const pending = r.status === "submitted" || (run.reportPolicy.requireCompanyApproval && r.status === "reviewed");
      if (!pending) continue;
    } else if (filter.status && r.status !== filter.status) continue;
    const row = reportRow(w, r.id);
    if (!row) continue;
    if (filter.sectionId) {
      const rs = w.runSessions.find((s) => s.id === r.runSessionId);
      if (rs?.sectionId !== filter.sectionId) continue;
    }
    rows.push(row);
  }
  rows.sort(
    (a, b) =>
      b.scheduledDate.localeCompare(a.scheduledDate) ||
      a.sectionLabel.localeCompare(b.sectionLabel, "ko") ||
      a.studentName.localeCompare(b.studentName, "ko"),
  );
  return rows;
}

export function applyReportReview(
  w: DemoWorld,
  reportIds: string[],
  action: ReportReviewAction,
  note: string | undefined,
  actor: "center" | "company",
  actorUid: string,
): void {
  const at = nowIso();
  for (const id of reportIds) {
    const r = w.reports.find((x) => x.id === id);
    if (!r) throw new Error("리포트를 찾을 수 없습니다.");
    const run = runById(w, r.programRunId);
    if (action === "return") {
      if (r.status === "published") throw new Error("이미 학부모에게 공개된 리포트는 반려할 수 없어요.");
      r.status = "draft";
      r.returnNote = note?.trim() || "내용을 보완해 주세요.";
      r.submittedAt = undefined;
      r.reviewedAt = undefined;
      r.updatedAt = at;
      continue;
    }
    if (action === "approve") {
      if (actor !== "center") throw new Error("센터 검수 단계에서만 승인 요청을 할 수 있어요.");
      if (r.status !== "submitted") throw new Error("검수 대기 상태의 리포트만 승인 요청할 수 있어요.");
      if (!run.reportPolicy.requireCompanyApproval) throw new Error("이 운영 건은 회사 승인 없이 바로 공개할 수 있어요.");
      r.status = "reviewed";
      r.reviewedAt = at;
      r.returnNote = undefined;
      r.updatedAt = at;
      continue;
    }
    // publish
    if (actor === "center") {
      if (r.status !== "submitted") throw new Error("검수 대기 상태의 리포트만 공개할 수 있어요.");
      if (run.reportPolicy.requireCompanyApproval) throw new Error("이 운영 건은 회사 승인 후 공개돼요. ‘승인 요청’을 눌러 주세요.");
    } else if (r.status !== "reviewed" && r.status !== "submitted") {
      throw new Error("승인 대기 상태의 리포트만 공개할 수 있어요.");
    }
    r.status = "published";
    r.reviewedAt = r.reviewedAt ?? at;
    r.publishedAt = at;
    r.returnNote = undefined;
    r.updatedAt = at;

    const rs = w.runSessions.find((s) => s.id === r.runSessionId);
    const student = w.students.find((s) => s.id === r.studentId);
    if (rs && student) {
      w.notifications.unshift({
        id: `ntf-rep-${r.id}`,
        type: "report",
        title: `${student.name} ${rs.sessionNumber}회차 리포트 도착`,
        body: `‘${rs.topic}’ 수업의 선생님 피드백이 올라왔어요.`,
        programRunId: r.programRunId,
        studentId: r.studentId,
        createdAt: at,
        createdByUid: actorUid,
        recipients: student.guardianUids.length,
        readBy: [],
      });
    }
  }
}
