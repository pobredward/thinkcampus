import { DUMMY_PROGRAM } from "@/data/dummyProgram";

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

export const DEMO_INSTRUCTOR_ROSTER = [
  { studentId: "student-001", name: "신민준", attendance: "present" as const },
  { studentId: "student-002", name: "신서연", attendance: "late" as const, lateMinutes: 8 },
  { studentId: "student-004", name: "김하은", attendance: "absent" as const },
];
