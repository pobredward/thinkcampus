/** shared/lib/generateRunSessions.ts 와 동기화 */

export type ProgramFrequency = 'weekly' | 'biweekly';
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface SessionPlanItem {
  sessionTemplateId: string;
  lessonCount?: number;
  topic?: string;
}

export interface GenerateRunSessionsInput {
  programRunId: string;
  startDate: string;
  frequency: ProgramFrequency;
  fixedDay: Weekday;
  startTime: string;
  endTime: string;
  location: string;
  sessionPlan: SessionPlanItem[];
  defaultLessonCount: number;
  excludedDates?: string[];
  fillSessionCount?: boolean;
  endDate?: string;
}

export interface GeneratedRunSessionDraft {
  sessionNumber: number;
  sessionTemplateId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  lessonCount: number;
  location: string;
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

export function generateRunSessionDrafts(input: GenerateRunSessionsInput): GeneratedRunSessionDraft[] {
  const excluded = new Set(input.excludedDates ?? []);
  const step = stepDays(input.frequency);
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
    if (endLimit && cursor > endLimit && !input.fillSessionCount) break;

    out.push({
      sessionNumber: i + 1,
      sessionTemplateId: plan.sessionTemplateId,
      scheduledDate: formatYmd(cursor),
      startTime: input.startTime,
      endTime: input.endTime,
      lessonCount: plan.lessonCount ?? input.defaultLessonCount,
      location: input.location,
    });
    cursor = addDays(cursor, step);
  }
  return out;
}
