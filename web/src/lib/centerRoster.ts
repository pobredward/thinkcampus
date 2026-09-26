export type RosterGuardianFilter = "all" | "linked" | "unlinked";

export interface CenterRosterRow {
  enrollmentId: string;
  studentId: string;
  name: string;
  photoUrl?: string;
  sectionId: string;
  sectionLabel: string;
  householdId?: string;
  enrollmentCodeStatus: "unused" | "used" | "unknown";
  guardianSummary: string;
  guardianLinked: boolean;
}
