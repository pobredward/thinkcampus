export interface CenterScheduleSession {
  id: string;
  sessionNumber: number;
  topic: string;
  sectionId: string;
  sectionLabel: string;
  startTime: string;
  endTime: string;
  location: string;
  instructorId?: string | null;
  instructorName?: string;
  attendanceRate: number;
  enrolledCount: number;
  recordedCount: number;
}

export interface CenterScheduleSlot {
  startTime: string;
  endTime: string;
  sessions: CenterScheduleSession[];
}

export interface CenterScheduleDay {
  date: string;
  slots: CenterScheduleSlot[];
}
