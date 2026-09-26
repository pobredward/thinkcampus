import type { Program } from "@/data/dummyProgram";
import { calcSummary, type SessionRecord, type StudentAttendance } from "@/data/dummyAttendance";

export interface FirestoreSessionAttendance {
  runSessionId: string;
  programRunId: string;
  studentId: string;
  status: "present" | "late" | "absent";
  lateMinutes?: number;
  participationScore?: number;
  homeworkDone?: boolean | null;
  feedback?: string;
  highlights?: string[];
  improvements?: string[];
}

export function mapFirestoreAttendanceToStudentAttendance(
  program: Program,
  studentId: string,
  studentName: string,
  records: FirestoreSessionAttendance[],
): StudentAttendance {
  const bySessionId = new Map(records.map((r) => [r.runSessionId, r]));

  const sessions: SessionRecord[] = program.sessions.map((session) => {
    const att = bySessionId.get(session.id);
    if (!att) {
      return {
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        date: session.date,
        topic: session.topic,
        programIcon: "📚",
        instructorName: session.instructor.name,
        status: "upcoming",
        participationScore: null,
        homeworkDone: null,
        feedback: null,
        highlights: [],
        improvements: [],
      };
    }
    return {
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
      date: session.date,
      topic: session.topic,
      programIcon: "📚",
      instructorName: session.instructor.name,
      status: att.status,
      lateMinutes: att.lateMinutes,
      participationScore: att.participationScore ?? null,
      homeworkDone: att.homeworkDone ?? null,
      feedback: att.feedback ?? null,
      highlights: att.highlights ?? [],
      improvements: att.improvements ?? [],
    };
  });

  return {
    studentId,
    studentName,
    campusName: "",
    campPeriod: `${program.startDate} – ${program.endDate}`,
    totalSessions: program.totalSessions,
    sessions,
  };
}

/** Firestore 출결만으로 홈 카드용 완료 회차 수 */
export function doneSessionCountFromRecords(
  program: Program,
  studentId: string,
  records: FirestoreSessionAttendance[],
): number {
  const att = mapFirestoreAttendanceToStudentAttendance(program, studentId, "", records);
  return calcSummary(att).doneCount;
}
