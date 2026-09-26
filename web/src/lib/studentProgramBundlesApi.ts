import type { FirestoreProgramRun, FirestoreRunSession } from "@/lib/mapProgramRun";
import { mapProgramRunToProgram } from "@/lib/mapProgramRun";
import type { Program } from "@/data/dummyProgram";
import type { StudentProgramBundle } from "@/hooks/useStudentPrograms";

export interface StudentProgramBundleDto {
  enrollmentId: string;
  programRunId: string;
  status: string;
  run: FirestoreProgramRun;
  sessions: Array<FirestoreRunSession & { id: string }>;
}

export function dtoToStudentProgramBundle(dto: StudentProgramBundleDto): StudentProgramBundle {
  const program = mapProgramRunToProgram(
    dto.programRunId,
    dto.run,
    dto.sessions,
    dto.status,
  );
  return {
    enrollmentId: dto.enrollmentId,
    programRunId: dto.programRunId,
    status: dto.status,
    program,
  };
}

export function dtoToProgram(dto: StudentProgramBundleDto): Program {
  return mapProgramRunToProgram(dto.programRunId, dto.run, dto.sessions, dto.status);
}
