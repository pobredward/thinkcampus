/**
 * Firestore reports/{id} 문서 → 화면·PDF 가 쓰는 StudentReport
 *   예전 문서(출석 요약 · 회차별 한마디 · 프로그램 이름이 없던 시절)나 빈 필드가 있어도 화면이 죽지 않게 기본값을 채운다.
 *   출석 요약이 없으면 회차별 한마디에서 세고, 그것도 없으면 total 0 (화면은 출석 칸을 숨긴다)
 */

import { getGrade, type CompetencyScore, type ProgramReport, type ReportGrade, type SessionNote, type StudentReport } from "@/data/dummyReport";

const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const grade = (v: unknown, score: number): ReportGrade => (v === "S" || v === "A" || v === "B" || v === "C" ? v : getGrade(score));

function competency(v: unknown): CompetencyScore | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const label = str(o.label);
  if (!label) return null;
  return { label, score: num(o.score), benchmark: num(o.benchmark), description: str(o.description) };
}

function program(v: unknown, i: number): ProgramReport | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const overallScore = num(o.overallScore);
  const preScore = num(o.preScore, overallScore);
  const postScore = num(o.postScore, overallScore);
  return {
    programId: str(o.programId, `p-${i + 1}`),
    sessionNumber: num(o.sessionNumber, i + 1),
    date: str(o.date),
    programName: str(o.programName, `${i + 1}회차`),
    instructorName: str(o.instructorName),
    instructorTitle: str(o.instructorTitle) || undefined,
    attendance: num(o.attendance, 100),
    overallScore,
    preScore,
    postScore,
    growthIndex: num(o.growthIndex, postScore - preScore),
    grade: grade(o.grade, overallScore),
    competencies: Array.isArray(o.competencies) ? o.competencies.map(competency).filter((x): x is CompetencyScore => !!x) : [],
    instructorComment: str(o.instructorComment),
    nextSteps: strs(o.nextSteps),
    highlights: strs(o.highlights),
  };
}

function note(v: unknown, i: number): SessionNote | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const status = o.status === "late" || o.status === "absent" ? o.status : "present";
  return { sessionNumber: num(o.sessionNumber, i + 1), date: str(o.date), topic: str(o.topic), instructorName: str(o.instructorName), status, note: str(o.note) };
}

export function normalizeStudentReport(raw: Record<string, unknown> & { reportId: string }): StudentReport {
  const programs = Array.isArray(raw.programs) ? raw.programs.map(program).filter((x): x is ProgramReport => !!x) : [];
  const sessionNotes = Array.isArray(raw.sessionNotes) ? raw.sessionNotes.map(note).filter((x): x is SessionNote => !!x) : [];
  const totalScore = num(raw.totalScore, programs.length ? Math.round(programs.reduce((s, p) => s + p.overallScore, 0) / programs.length) : 0);

  const a = raw.attendanceSummary && typeof raw.attendanceSummary === "object" ? (raw.attendanceSummary as Record<string, unknown>) : null;
  const attendanceSummary = a
    ? { total: num(a.total), present: num(a.present), late: num(a.late), absent: num(a.absent), homeworkDone: num(a.homeworkDone), homeworkTotal: num(a.homeworkTotal) }
    : {
        total: sessionNotes.length,
        present: sessionNotes.filter((n) => n.status === "present").length,
        late: sessionNotes.filter((n) => n.status === "late").length,
        absent: sessionNotes.filter((n) => n.status === "absent").length,
        homeworkDone: 0,
        homeworkTotal: 0,
      };

  const np = raw.nextProgram && typeof raw.nextProgram === "object" ? (raw.nextProgram as Record<string, unknown>) : null;

  return {
    reportId: raw.reportId,
    studentId: str(raw.studentId),
    studentName: str(raw.studentName, "학생"),
    campusName: str(raw.campusName),
    programTitle: str(raw.programTitle) || str(raw.programName) || "종합 학습 리포트",
    campPeriod: str(raw.campPeriod),
    issueDate: str(raw.issueDate),
    issuedBy: str(raw.issuedBy) || str(raw.campusName) || "ThinkCampus",
    totalScore,
    totalGrade: grade(raw.totalGrade, totalScore),
    overallComment: str(raw.overallComment),
    personalityType: str(raw.personalityType),
    personalityDesc: str(raw.personalityDesc),
    strengthAreas: strs(raw.strengthAreas),
    growthAreas: strs(raw.growthAreas),
    attendanceSummary,
    programs,
    sessionNotes,
    nextProgram: np && str(np.title) ? { title: str(np.title), period: str(np.period), note: str(np.note) } : undefined,
    closingMessage: str(raw.closingMessage),
  };
}
