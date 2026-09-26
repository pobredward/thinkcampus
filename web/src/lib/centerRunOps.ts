/** getCenterRunOps Callable 응답 (웹) */

export type CenterReportStatus = "draft" | "centerReviewed" | "published";

export interface CenterDashboardKpi {
  sessionsToday: number;
  attendancePendingSessions: number;
  reportsPendingReview: number;
  studentsWithoutGuardian: number;
  sessionsWithoutInstructor: number;
}

export interface CenterLessonRow {
  id: string;
  sessionNumber: number;
  topic: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  instructorName?: string;
  attendanceRate: number;
}

export interface CenterStudentRow {
  studentId: string;
  name: string;
  householdId?: string;
  enrollmentCodeStatus: "unused" | "used" | "unknown";
}

export interface CenterGuardianRow {
  studentId: string;
  studentName: string;
  guardians: Array<{
    name: string;
    relation: string;
    linked: boolean;
    linkedAt?: string;
  }>;
  unlinkedNote?: string;
}

export interface CenterInstructorRow {
  staffId: string;
  name: string;
  email?: string;
  sessionsThisWeek: number;
}

export interface CenterReportRow {
  id: string;
  sessionNumber: number;
  studentName: string;
  status: CenterReportStatus;
  instructorName?: string;
  submittedAt?: string;
}

export interface CenterNotificationRow {
  id: string;
  type: string;
  title: string;
  sentAt: string;
  channel: string;
}

export interface CenterRunOps {
  programRunId: string;
  contractCode: string;
  campusId: string;
  dashboard: CenterDashboardKpi;
  lessons: CenterLessonRow[];
  students: CenterStudentRow[];
  guardians: CenterGuardianRow[];
  instructors: CenterInstructorRow[];
  reports: CenterReportRow[];
  notifications: CenterNotificationRow[];
}
