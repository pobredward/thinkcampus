import { DUMMY_PROGRAM, type Session } from "@/data/dummyProgram";

export const DEMO_INSTRUCTOR_CLASS = {
  programRunId: DUMMY_PROGRAM.id,
  contractCode: "SEED-ROSTER-001",
  title: DUMMY_PROGRAM.title,
  campusName: "달성캠퍼스",
  schedule: "격주 토요 10:00–12:00",
};

export const DEMO_INSTRUCTOR_SESSIONS = DUMMY_PROGRAM.sessions.map((s) => ({
  id: s.id,
  sessionNumber: s.sessionNumber,
  date: s.date,
  topic: s.topic,
  location: s.location ?? "강남구 청소년수련관 3층",
  status: s.sessionNumber <= 2 ? ("done" as const) : s.sessionNumber === 3 ? ("today" as const) : ("upcoming" as const),
}));

export type InstructorAttendance = "present" | "late" | "absent" | "unset";

export interface InstructorRosterRow {
  studentId: string;
  name: string;
  attendance: InstructorAttendance;
  lateMinutes?: number;
  participationScore?: number;
  homeworkDone?: boolean | null;
  feedback?: string;
  highlight?: string;
}

export const DEMO_INSTRUCTOR_ROSTER_INITIAL: InstructorRosterRow[] = [
  { studentId: "student-001", name: "신민준", attendance: "unset", participationScore: 4 },
  { studentId: "student-002", name: "신서연", attendance: "unset", participationScore: 3 },
  { studentId: "student-004", name: "김하은", attendance: "unset" },
];

/** 회차별 Canva·계획서 자료 (차시 단위) */
export interface InstructorLessonMaterial {
  lessonCode: string;
  title: string;
  planUrl?: string;
  slideViewUrl?: string;
  slideTemplateUrl?: string;
  activityUrl?: string;
}

/** Canva design URL → 템플릿(편집) 링크 체험용 변환 */
function canvaTemplateFromView(viewUrl: string): string {
  return viewUrl.replace("/view", "/edit");
}

export function lessonMaterialsForSession(session: Session | undefined): InstructorLessonMaterial[] {
  if (!session?.lessonPlans?.length) return [];
  const codeBase = session.programCode ?? "HM-WA";
  return session.lessonPlans.map((lp) => ({
    lessonCode: `${codeBase}-L${lp.lessonNumber}`,
    title: lp.topic,
    planUrl: session.planUrl,
    slideViewUrl: lp.slideUrl,
    slideTemplateUrl: lp.slideUrl ? canvaTemplateFromView(lp.slideUrl) : undefined,
    activityUrl: lp.activityUrl,
  }));
}

export function sessionMetaForReport(session: Session | undefined) {
  if (!session) return null;
  return {
    objectives: session.objectives ?? [],
    teachingMethod: session.teachingMethod,
    curriculum: session.curriculum ?? [],
    materials: session.materials ?? [],
    rotationNote: session.rotationNote,
  };
}
