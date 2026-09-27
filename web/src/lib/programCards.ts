import type { Program } from "@/data/dummyProgram";
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

/** 수강 목록 → 홈 카드 (출결 기록이 있으면 그 기준으로 진도, 없으면 0회) */
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
    const doneFromRecords = records && records.length > 0 ? doneSessionCountFromRecords(b.program, studentId, records) : 0;
    const done = b.status === "completed" ? b.program.totalSessions : Math.min(doneFromRecords, b.program.totalSessions);

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
