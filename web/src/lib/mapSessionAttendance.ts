import type { Program } from "@/data/dummyProgram";
import { calcSummary, type SessionRecord, type StudentAttendance } from "@/data/dummyAttendance";

import type { AttendanceRecordDto } from "@/services/types";

/** sessionAttendance 문서 (services/types.ts 의 AttendanceRecordDto 와 같다) */
export type FirestoreSessionAttendance = AttendanceRecordDto;

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
      checkinTime: att.checkinTime,
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

/** 출결 기록이 아직 없는 학생 — 모든 회차가 예정 */
export function emptyAttendance(program: Program, studentId: string | null | undefined, studentName: string): StudentAttendance {
  return mapFirestoreAttendanceToStudentAttendance(program, studentId ?? "", studentName, []);
}

/** 출결 기록만으로 홈 카드용 완료 회차 수 */
export function doneSessionCountFromRecords(
  program: Program,
  studentId: string,
  records: FirestoreSessionAttendance[],
): number {
  const att = mapFirestoreAttendanceToStudentAttendance(program, studentId, "", records);
  return calcSummary(att).doneCount;
}
