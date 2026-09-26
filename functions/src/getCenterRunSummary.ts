import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';
import { COL_GUARDIAN_LINKS } from './lib/collections';
import { getDb, todayKstDate, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';

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

export interface GetCenterRunSummaryRequest {
  programRunId: string;
}

export interface GetCenterRunSummaryResponse {
  programRunId: string;
  contractCode: string;
  campusId: string;
  sections: ProgramSectionDto[];
  scheduleDates: string[];
  dashboard: CenterDashboardKpi;
}

function normalizeSections(run: admin.firestore.DocumentData): Array<{ id: string; label: string; sortOrder: number }> {
  const raw = run.sections;
  if (!Array.isArray(raw)) return [];
  const out: Array<{ id: string; label: string; sortOrder: number }> = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? '').trim();
    const label = String(row.label ?? '').trim();
    if (!id || !label) continue;
    out.push({ id, label, sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : out.length });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function buildCenterRunSummary(
  req: CallableRequest<GetCenterRunSummaryRequest>,
  programRunId: string,
): Promise<GetCenterRunSummaryResponse> {
    const runSnap = await getDb().collection('programRuns').doc(programRunId).get();
    if (!runSnap.exists) {
      throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
    }
    const run = runSnap.data()!;
    const campusId = run.campusId as string;
    const contractCode = run.contractCode as string;
    assertCenterStaffForCampus(req, campusId);

    const catalogSections = normalizeSections(run);
    const today = todayKstDate();

    const [enrSnap, sessSnap, attSnap, reportsSnap] = await Promise.all([
      getDb().collection('studentProgramEnrollments').where('programRunId', '==', programRunId).get(),
      getDb()
        .collection('runSessions')
        .where('programRunId', '==', programRunId)
        .orderBy('sessionNumber', 'asc')
        .get(),
      getDb().collection('sessionAttendance').where('programRunId', '==', programRunId).get(),
      getDb().collection('sessionReports').where('programRunId', '==', programRunId).get(),
    ]);

    const sectionCounts = new Map<string, number>();
    const studentIds: string[] = [];
    for (const doc of enrSnap.docs) {
      const data = doc.data();
      const sid = data.studentId as string;
      studentIds.push(sid);
      const sectionId = (data.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      sectionCounts.set(sectionId, (sectionCounts.get(sectionId) ?? 0) + 1);
    }

    const sections: ProgramSectionDto[] = [];
    const seenSection = new Set<string>();
    for (const s of catalogSections) {
      sections.push({ ...s, studentCount: sectionCounts.get(s.id) ?? 0 });
      seenSection.add(s.id);
    }
    for (const [id, count] of sectionCounts) {
      if (seenSection.has(id)) continue;
      sections.push({
        id,
        label: id === UNASSIGNED_SECTION_ID ? '미배정' : id,
        sortOrder: sections.length,
        studentCount: count,
      });
    }

    const attBySession = new Map<string, number>();
    for (const doc of attSnap.docs) {
      const rsid = doc.data().runSessionId as string;
      if (!rsid) continue;
      attBySession.set(rsid, (attBySession.get(rsid) ?? 0) + 1);
    }

    let sessionsToday = 0;
    const slotKeysToday = new Set<string>();
    const scheduledDatesSet = new Set<string>();
    let attendancePendingSessions = 0;
    let sessionsWithoutInstructor = 0;

    for (const doc of sessSnap.docs) {
      const s = doc.data();
      if ((s.status as string) === 'cancelled') continue;
      const scheduledDate = (s.scheduledDate as string)?.trim() || '';
      if (scheduledDate) scheduledDatesSet.add(scheduledDate);
      const startTime = (s.startTime as string) || (run.startTime as string) || '';
      const sectionId = (s.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      const expected = sectionCounts.get(sectionId) ?? enrSnap.size;
      const recorded = attBySession.get(doc.id) ?? 0;

      if (scheduledDate === today) {
        sessionsToday += 1;
        slotKeysToday.add(`${scheduledDate}__${startTime}`);
      }
      if (!s.instructorId) sessionsWithoutInstructor += 1;
      if (expected > 0 && recorded < expected) attendancePendingSessions += 1;
    }

    const scheduleDates = Array.from(scheduledDatesSet).sort();

    const studentIdSet = new Set(studentIds);
    const linksSnap = await getDb().collection(COL_GUARDIAN_LINKS).where('campusId', '==', campusId).get();
    const linkedStudents = new Set<string>();
    for (const link of linksSnap.docs) {
      const sid = link.data().studentId as string;
      if (studentIdSet.has(sid)) linkedStudents.add(sid);
    }

    let studentsWithoutGuardian = 0;
    for (let i = 0; i < studentIds.length; i += 100) {
      const chunk = studentIds.slice(i, i + 100);
      const refs = chunk.map((id) => getDb().collection('students').doc(id));
      const snaps = await getDb().getAll(...refs);
      for (const stSnap of snaps) {
        if (!stSnap.exists) {
          studentsWithoutGuardian += 1;
          continue;
        }
        const sid = stSnap.id;
        const guardians = (stSnap.data()?.guardianUids as string[]) ?? [];
        if (guardians.length === 0 && !linkedStudents.has(sid)) studentsWithoutGuardian += 1;
      }
    }

    let reportsPendingReview = 0;
    for (const doc of reportsSnap.docs) {
      if ((doc.data().status as string) === 'centerReviewed') reportsPendingReview += 1;
    }

    const sectionsWithStudents = sections.filter((s) => s.studentCount > 0).length;

    return {
      programRunId,
      contractCode,
      campusId,
      sections,
      scheduleDates,
      dashboard: {
        totalStudents: enrSnap.size,
        sectionsActive: sectionsWithStudents,
        sessionsToday,
        parallelSlotsToday: slotKeysToday.size,
        attendancePendingSessions,
        reportsPendingReview,
        studentsWithoutGuardian,
        sessionsWithoutInstructor,
      },
    };
}

export const getCenterRunSummary = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<GetCenterRunSummaryRequest>): Promise<GetCenterRunSummaryResponse> => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) {
      throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    }
    return buildCenterRunSummary(req, programRunId);
  },
);
