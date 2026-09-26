/**
 * 운영 건(programRuns) · 회차(runSessions) · 카탈로그 타입
 * @see docs/DATA_MODEL.md
 */

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Date.getDay()

export type ProgramFrequency = 'weekly' | 'biweekly';

export type ProgramRunStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'completed'
  | 'cancelled';

export type RunSessionStatus = 'scheduled' | 'cancelled' | 'completed';

export type RunSessionSource = 'generated' | 'manual';

export type StudentProgramStatus =
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'withdrawn';

export interface ProgramRule {
  title: string;
  body: string;
  important?: boolean;
}

export interface ProgramQnA {
  topic: string;
  q: string;
  a: string;
}

export interface ProgramDirection {
  label: string;
  text: string;
}

export interface SessionPlanItem {
  sessionTemplateId: string;
  lessonCount?: number;
}

export interface ProgramRunOverrides {
  purpose?: string;
  overview?: string;
  notices?: string[];
  rules?: ProgramRule[];
  faq?: ProgramQnA[];
  directions?: ProgramDirection[];
}

export interface ReportPolicy {
  requireCompanyApproval: boolean;
}

/** 카탈로그 — 프로그램 패키지 */
export interface ProgramTemplate {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  category?: string;
  defaultSessionCount: number;
  defaultSessionHours: number;
  defaultFrequency: ProgramFrequency;
  defaultFixedDay: Weekday;
  defaultStartTime: string;
  defaultEndTime: string;
  status: 'draft' | 'published';
}

/** 카탈로그 — 회차 템플릿 */
export interface SessionTemplate {
  id: string;
  programTemplateId: string;
  order: number;
  topic: string;
  description: string;
  defaultLessonCount: number;
  sampleAssets?: {
    slidesPdfUrl?: string;
    thumbUrl?: string;
  };
  defaultCurriculum?: string[];
  defaultMaterials?: string[];
  defaultObjectives?: string[];
}

/** 지자체·캠퍼스에서 실제로 돌리는 한 건 */
export interface ProgramRun {
  id: string;
  contractCode: string;
  programTemplateId: string;
  campusId: string;
  municipalityName: string;
  logoUrl?: string;
  host?: string;
  status: ProgramRunStatus;
  startDate: string;
  endDate?: string;
  frequency: ProgramFrequency;
  fixedDay: Weekday;
  startTime: string;
  endTime: string;
  location: string;
  mapQuery?: string;
  sessionPlan: SessionPlanItem[];
  overrides?: ProgramRunOverrides;
  reportPolicy: ReportPolicy;
}

export interface RunSessionOverrides {
  topic?: string;
  description?: string;
  canvaSlideUrl?: string;
  canvaActivityUrl?: string;
  planUrl?: string;
}

/** 운영 건의 실제 회차 (날짜·강사·휴강) */
export interface RunSession {
  id: string;
  programRunId: string;
  sessionNumber: number;
  sessionTemplateId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  instructorId?: string;
  location?: string;
  status: RunSessionStatus;
  cancelReason?: string;
  makeUpDate?: string;
  overrides?: RunSessionOverrides;
  source: RunSessionSource;
}

export interface StudentProgramEnrollment {
  id: string;
  studentId: string;
  programRunId: string;
  campusId: string;
  status: StudentProgramStatus;
  externalRef?: string;
}

/** bulk import CSV 1행 */
export interface RosterImportRow {
  studentName: string;
  birthDate: string;
  contractCode: string;
  campusId: string;
  /** 있으면 동일 키 = 형제. 없으면 학부모 번호로 자동 묶음 시도 */
  householdKey?: string;
  /** 학부모·연락처 번호 (선택). 동일 번호 = 동일 가구 — 보호자 검증 없음 */
  guardianPhone?: string;
  parentPhone?: string;
  externalStudentId?: string;
}

export type EnrollmentCodeUsedVia = 'redeem' | 'householdLink';
