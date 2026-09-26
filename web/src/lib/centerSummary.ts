export interface ProgramSectionDto {
  id: string;
  label: string;
  sortOrder: number;
  studentCount: number;
}

export interface CenterDashboardKpi {
  totalStudents: number;
  sectionsActive: number;
  sessionsToday: number;
  parallelSlotsToday: number;
  attendancePendingSessions: number;
  reportsPendingReview: number;
  studentsWithoutGuardian: number;
  sessionsWithoutInstructor: number;
}

export interface CenterRunSummary {
  programRunId: string;
  contractCode: string;
  campusId: string;
  sections: ProgramSectionDto[];
  scheduleDates?: string[];
  dashboard: CenterDashboardKpi;
}
