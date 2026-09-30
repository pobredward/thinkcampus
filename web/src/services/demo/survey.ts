/**
 * 체험 세계 — 학부모 만족도 조사 (실서비스 functions/src/survey.ts 와 같은 규칙)
 *   - 운영 건마다 조사 하나 (surveys/{programRunId}) — 열리는 때 · 닫히는 때가 있다
 *   - 응답은 학생마다 하나 (`${programRunId}_${studentId}`), 마감 전까지 고칠 수 있다
 *   - 대상: 보호자가 연결된 수강생 (응답률 분모)
 *   - 후기 공개 동의(기본 꺼짐)한 것만 발주처 화면 · 보고서에 나간다
 */

import type { PendingSurveyDto, SubmitSurveyInput, SurveyDto, SurveyResultsDto, SurveyStatus } from "@/services/types";
import { maskName } from "./chat";
import { activeEnrollments, runById, sectionLabel } from "./select";
import { type DemoSurvey, type DemoWorld, nowIso } from "./world";

export function surveyStatus(s: Pick<DemoSurvey, "opensAt" | "closesAt">, now = Date.now()): SurveyStatus {
  if (now < new Date(s.opensAt).getTime()) return "upcoming";
  if (now > new Date(s.closesAt).getTime()) return "closed";
  return "open";
}

function eligibleStudents(w: DemoWorld, programRunId: string): string[] {
  const run = runById(w, programRunId);
  const statuses = run.status === "completed" ? ["completed", "active"] : ["active"];
  return w.enrollments
    .filter((e) => e.programRunId === programRunId && statuses.includes(e.status))
    .map((e) => e.studentId)
    .filter((id) => (w.students.find((s) => s.id === id)?.guardianUids.length ?? 0) > 0);
}

export function surveyDtoFor(w: DemoWorld, uid: string, studentId: string, programRunId: string): SurveyDto | null {
  const survey = w.surveys.find((s) => s.programRunId === programRunId);
  if (!survey) return null;
  const student = w.students.find((s) => s.id === studentId);
  if (!student || !student.guardianUids.includes(uid)) throw new Error("이 학생의 보호자만 응답할 수 있어요.");
  const run = runById(w, programRunId);
  const r = w.surveyResponses.find((x) => x.id === `${programRunId}_${studentId}`);
  return {
    programRunId,
    programTitle: run.title,
    studentId,
    studentName: student.name,
    title: survey.title,
    intro: survey.intro,
    items: survey.items,
    allowReview: survey.allowReview,
    consentLabel: survey.consentLabel,
    opensAt: survey.opensAt,
    closesAt: survey.closesAt,
    status: surveyStatus(survey),
    myResponse: r ? { scores: r.scores, review: r.review, consentPublic: r.consentPublic, submittedAt: r.submittedAt } : null,
  };
}

export function pendingSurveysFor(w: DemoWorld, uid: string): PendingSurveyDto[] {
  const mine = w.students.filter((s) => s.guardianUids.includes(uid));
  const out: PendingSurveyDto[] = [];
  for (const survey of w.surveys) {
    if (surveyStatus(survey) !== "open") continue;
    const eligible = new Set(eligibleStudents(w, survey.programRunId));
    for (const s of mine) {
      if (!eligible.has(s.id)) continue;
      if (w.surveyResponses.some((r) => r.id === `${survey.programRunId}_${s.id}`)) continue;
      out.push({
        programRunId: survey.programRunId,
        programTitle: runById(w, survey.programRunId).title,
        studentId: s.id,
        studentName: s.name,
        title: survey.title,
        closesAt: survey.closesAt,
      });
    }
  }
  return out.sort((a, b) => a.closesAt.localeCompare(b.closesAt) || a.studentName.localeCompare(b.studentName, "ko"));
}

export function submitSurveyInWorld(w: DemoWorld, uid: string, input: SubmitSurveyInput): void {
  const survey = w.surveys.find((s) => s.programRunId === input.programRunId);
  if (!survey) throw new Error("만족도 조사를 찾을 수 없어요.");
  if (surveyStatus(survey) !== "open") throw new Error("응답 기간이 아니에요.");
  const student = w.students.find((s) => s.id === input.studentId);
  if (!student || !student.guardianUids.includes(uid)) throw new Error("이 학생의 보호자만 응답할 수 있어요.");
  if (!eligibleStudents(w, input.programRunId).includes(input.studentId)) throw new Error("이 프로그램 수강생이 아니에요.");
  for (const item of survey.items) {
    const v = input.scores[item.id];
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error(`‘${item.label}’ 점수를 골라 주세요.`);
  }
  const review = survey.allowReview ? input.review.trim().slice(0, 500) : "";
  const id = `${input.programRunId}_${input.studentId}`;
  const scores = Object.fromEntries(survey.items.map((i) => [i.id, input.scores[i.id]]));
  const existing = w.surveyResponses.find((r) => r.id === id);
  const row = { id, programRunId: input.programRunId, studentId: input.studentId, guardianUid: uid, scores, review, consentPublic: !!review && input.consentPublic, submittedAt: nowIso() };
  if (existing) Object.assign(existing, row);
  else w.surveyResponses.push(row);
}

export function surveyResults(w: DemoWorld, programRunId: string, opts: { publicOnly: boolean; mask: boolean }): SurveyResultsDto | null {
  const survey = w.surveys.find((s) => s.programRunId === programRunId);
  if (!survey) return null;
  const run = runById(w, programRunId);
  const responses = w.surveyResponses.filter((r) => r.programRunId === programRunId);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
  const items = survey.items.map((it) => {
    const vals = responses.map((r) => r.scores[it.id]).filter((v): v is number => typeof v === "number");
    const distribution = [1, 2, 3, 4, 5].map((n) => vals.filter((v) => v === n).length);
    return { id: it.id, label: it.label, question: it.question, avg: avg(vals), distribution };
  });
  const all = responses.flatMap((r) => Object.values(r.scores));
  const enr = activeEnrollments(w, programRunId);
  const reviews = responses
    .filter((r) => r.review && (!opts.publicOnly || r.consentPublic))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((r) => {
      const st = w.students.find((s) => s.id === r.studentId);
      const e = enr.find((x) => x.studentId === r.studentId);
      const name = st ? (opts.mask || opts.publicOnly ? maskName(st.name) : st.name) : "학생";
      return { id: r.id, text: r.review, studentLabel: `${name} 학부모${e ? ` · ${sectionLabel(run, e.sectionId)}` : ""}`, submittedAt: r.submittedAt, consentPublic: r.consentPublic };
    });
  return {
    programRunId,
    title: survey.title,
    status: surveyStatus(survey),
    opensAt: survey.opensAt,
    closesAt: survey.closesAt,
    eligible: eligibleStudents(w, programRunId).length,
    responses: responses.length,
    overallAvg: avg(all),
    items,
    reviews,
  };
}
