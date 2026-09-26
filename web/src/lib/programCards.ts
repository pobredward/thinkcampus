import type { Program } from "@/data/dummyProgram";
import { calcSummary } from "@/data/dummyAttendance";
import { pickDummyAttendance } from "@/data/programView";
import type { StudentProgramBundle } from "@/hooks/useStudentPrograms";
import {
  doneSessionCountFromRecords,
  type FirestoreSessionAttendance,
} from "@/lib/mapSessionAttendance";

export interface ProgramCard {
  programId: string;
  studentId: string;
  studentName: string;
  title: string;
  subtitle: string;
  totalSessions: number;
  totalHours: number;
  completedSessions: number;
  nextSessionDate: string | null;
  nextSessionTopic: string | null;
  nextSessionStartTime: string | null;
  nextSessionEndTime: string | null;
  nextSessionLocation: string | null;
  fixedDay: string;
  frequency: string;
  status: "active" | "upcoming" | "completed";
  startDate?: string;
  endDate?: string;
}

function cardFromProgram(
  program: Program,
  studentId: string,
  studentName: string,
  completedSessions: number,
): ProgramCard {
  const upcomingSessions = program.sessions.filter((s) => !s.isCancelled);
  const next = upcomingSessions[completedSessions] ?? upcomingSessions.find((s) => !s.isCancelled) ?? null;
  const status =
    program.status === "upcoming"
      ? "upcoming"
      : program.status === "completed"
        ? "completed"
        : "active";

  return {
    programId: program.id,
    studentId,
    studentName,
    title: program.title,
    subtitle: program.subtitle,
    totalSessions: program.totalSessions,
    totalHours: program.totalHours,
    completedSessions,
    nextSessionDate: next?.date ?? null,
    nextSessionTopic: next?.topic ?? null,
    nextSessionStartTime: next?.startTime ?? null,
    nextSessionEndTime: next?.endTime ?? null,
    nextSessionLocation: next?.location ?? program.location,
    fixedDay: program.fixedDay,
    frequency: program.frequency === "biweekly" ? "격주" : "매주",
    status,
    startDate: program.startDate,
    endDate: program.endDate,
  };
}

/** Firestore 수강 목록 → 홈 카드 (출결 있으면 sessionAttendance 기준 진도) */
export function buildProgramCardsFromBundles(
  studentId: string,
  studentName: string,
  bundles: StudentProgramBundle[],
  attendanceByRunId?: Record<string, FirestoreSessionAttendance[]>,
): { active: ProgramCard[]; upcoming: ProgramCard[]; pastCount: number } {
  const active: ProgramCard[] = [];
  const upcoming: ProgramCard[] = [];
  let pastCount = 0;

  for (const b of bundles) {
    const records = attendanceByRunId?.[b.programRunId];
    const doneFromFirestore =
      records && records.length > 0
        ? doneSessionCountFromRecords(b.program, studentId, records)
        : null;
    const att = pickDummyAttendance(studentId);
    const summary = calcSummary(att);
    const fallbackDone = Math.min(summary.doneCount, b.program.totalSessions);
    const done =
      b.status === "completed"
        ? b.program.totalSessions
        : doneFromFirestore !== null
          ? Math.min(doneFromFirestore, b.program.totalSessions)
          : fallbackDone;

    if (b.status === "completed") {
      pastCount++;
      continue;
    }
    if (b.status === "upcoming" || b.program.status === "upcoming") {
      upcoming.push(cardFromProgram(b.program, studentId, studentName, 0));
      continue;
    }
    active.push(cardFromProgram(b.program, studentId, studentName, done));
  }

  return { active, upcoming, pastCount };
}
