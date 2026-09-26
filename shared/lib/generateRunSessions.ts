/**
 * 운영 건 sessionPlan + 시작일·격주/매주 규칙 → runSessions 초안 날짜 배열
 * 센터 휴강은 생성 후 runSession.status / makeUpDate 로 조정 (재생성 optional)
 */

import type {
  ProgramFrequency,
  RunSession,
  RunSessionSource,
  SessionPlanItem,
  Weekday,
} from '../schema/programOps';

export interface GenerateRunSessionsInput {
  programRunId: string;
  startDate: string; // YYYY-MM-DD
  frequency: ProgramFrequency;
  fixedDay: Weekday;
  startTime: string;
  endTime: string;
  location: string;
  sessionPlan: SessionPlanItem[];
  /** 회차당 lessonCount — sessionPlan[].lessonCount 없을 때 fallback */
  defaultLessonCount: number;
  /** 지자체·센터 휴무 (해당 날은 건너뛰고 다음 슬롯으로) */
  excludedDates?: string[];
  /** true면 endDate 넘어도 N회 채울 때까지 진행 */
  fillSessionCount?: boolean;
  endDate?: string;
  source?: RunSessionSource;
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

/** startDate 이후(포함) 첫 fixedDay */
export function firstSessionDate(startDate: string, fixedDay: Weekday): string {
  let d = parseYmd(startDate);
  for (let i = 0; i < 7; i++) {
    if (d.getDay() === fixedDay) return formatYmd(d);
    d = addDays(d, 1);
  }
  return formatYmd(d);
}

function stepDays(frequency: ProgramFrequency): number {
  return frequency === 'weekly' ? 7 : 14;
}

export interface GeneratedRunSessionDraft {
  sessionNumber: number;
  sessionTemplateId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  location: string;
  source: RunSessionSource;
}

/**
 * sessionPlan 길이만큼 날짜를 배정. excludedDates에 있으면 그날은 쓰지 않고 주기만큼 미룸.
 */
export function generateRunSessionDrafts(
  input: GenerateRunSessionsInput,
): GeneratedRunSessionDraft[] {
  const excluded = new Set(input.excludedDates ?? []);
  const step = stepDays(input.frequency);
  const source = input.source ?? 'generated';
  let cursor = parseYmd(firstSessionDate(input.startDate, input.fixedDay));
  const endLimit = input.endDate ? parseYmd(input.endDate) : null;

  const out: GeneratedRunSessionDraft[] = [];

  for (let i = 0; i < input.sessionPlan.length; i++) {
    const plan = input.sessionPlan[i];
    let guard = 0;
    while (excluded.has(formatYmd(cursor)) && guard < 104) {
      cursor = addDays(cursor, step);
      guard++;
    }

    if (endLimit && cursor > endLimit && !input.fillSessionCount) {
      break;
    }

    out.push({
      sessionNumber: i + 1,
      sessionTemplateId: plan.sessionTemplateId,
      scheduledDate: formatYmd(cursor),
      startTime: input.startTime,
      endTime: input.endTime,
      lessonCount: plan.lessonCount ?? input.defaultLessonCount,
      location: input.location,
      source,
    });

    cursor = addDays(cursor, step);
  }

  return out;
}

/** draft → RunSession (id는 호출측에서 부여) */
export function draftsToRunSessions(
  programRunId: string,
  drafts: GeneratedRunSessionDraft[],
  idFactory: (sessionNumber: number) => string,
): RunSession[] {
  return drafts.map((d) => ({
    id: idFactory(d.sessionNumber),
    programRunId,
    sessionNumber: d.sessionNumber,
    sessionTemplateId: d.sessionTemplateId,
    scheduledDate: d.scheduledDate,
    startTime: d.startTime,
    endTime: d.endTime,
    lessonCount: d.lessonCount,
    location: d.location,
    status: 'scheduled',
    source: d.source,
  }));
}
