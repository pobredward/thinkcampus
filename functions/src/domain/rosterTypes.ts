/** @see docs/DATA_MODEL.md — importRoster 요청/응답 */

export interface RosterImportRow {
  studentName: string;
  birthDate: string;
  contractCode: string;
  campusId: string;
  householdKey?: string;
  /** 학부모·연락처 번호 (선택). 동일 번호 = 동일 가구 묶음 — 보호자 여부는 import 시 검증하지 않음 */
  guardianPhone?: string;
  /** CSV 헤더 alias */
  parentPhone?: string;
  externalStudentId?: string;
}

export interface ImportRosterRequest {
  rows: RosterImportRow[];
  /** true면 검증·미리보기만, Firestore 쓰기 없음 */
  dryRun?: boolean;
}

export interface ImportRosterRowPreview {
  rowIndex: number;
  studentId: string;
  studentName: string;
  householdId: string;
  programRunId: string;
  contractCode: string;
  enrollmentCode: string;
  isNewStudent: boolean;
  isNewProgramEnrollment: boolean;
  isNewCode: boolean;
}

export interface ImportRosterResponse {
  dryRun: boolean;
  rowCount: number;
  createdStudents: number;
  updatedStudents: number;
  createdProgramEnrollments: number;
  createdEnrollmentCodes: number;
  previews: ImportRosterRowPreview[];
  errors: Array<{ rowIndex: number; message: string }>;
}
