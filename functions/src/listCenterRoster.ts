import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';
import { COL_GUARDIAN_LINKS } from './lib/collections';
import { getDb, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';
import { resolveGuardianDisplay } from './lib/guardianDisplay';

const MAX_PAGE = 50;

export type RosterGuardianFilter = 'all' | 'linked' | 'unlinked';

export interface ListCenterRosterRequest {
  programRunId: string;
  sectionId?: string;
  q?: string;
  guardianFilter?: RosterGuardianFilter;
  pageSize?: number;
  cursor?: string;
}

export interface CenterRosterRow {
  enrollmentId: string;
  studentId: string;
  name: string;
  photoUrl?: string;
  sectionId: string;
  sectionLabel: string;
  householdId?: string;
  enrollmentCodeStatus: 'unused' | 'used' | 'unknown';
  guardianSummary: string;
  guardianLinked: boolean;
}

export interface ListCenterRosterResponse {
  rows: CenterRosterRow[];
  nextCursor: string | null;
  totalApprox?: number;
}

function sectionLabel(
  sections: Map<string, string>,
  sectionId: string,
): string {
  if (sectionId === UNASSIGNED_SECTION_ID) return '미배정';
  return sections.get(sectionId) ?? sectionId;
}

export const listCenterRoster = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<ListCenterRosterRequest>): Promise<ListCenterRosterResponse> => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) {
      throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    }
    const pageSize = Math.min(Math.max(req.data?.pageSize ?? 30, 1), MAX_PAGE);
    const sectionFilter = req.data?.sectionId?.trim();
    const q = req.data?.q?.trim().toLowerCase();
    const guardianFilter = req.data?.guardianFilter ?? 'all';

    const runSnap = await getDb().collection('programRuns').doc(programRunId).get();
    if (!runSnap.exists) {
      throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
    }
    const run = runSnap.data()!;
    const campusId = run.campusId as string;
    assertCenterStaffForCampus(req, campusId);

    const sectionLabels = new Map<string, string>();
    if (Array.isArray(run.sections)) {
      for (const item of run.sections) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const id = String(row.id ?? '').trim();
        const label = String(row.label ?? '').trim();
        if (id && label) sectionLabels.set(id, label);
      }
    }

    let query = getDb()
      .collection('studentProgramEnrollments')
      .where('programRunId', '==', programRunId)
      .orderBy('studentName', 'asc');

    if (sectionFilter && sectionFilter !== 'all') {
      query = getDb()
        .collection('studentProgramEnrollments')
        .where('programRunId', '==', programRunId)
        .where('sectionId', '==', sectionFilter)
        .orderBy('studentName', 'asc');
    }

    if (req.data?.cursor) {
      const cursorSnap = await getDb().collection('studentProgramEnrollments').doc(req.data.cursor).get();
      if (cursorSnap.exists) {
        query = query.startAfter(cursorSnap);
      }
    }

    const snap = await query.limit(pageSize + 1).get();
    const docs = snap.docs.slice(0, pageSize);
    const nextCursor = snap.docs.length > pageSize ? snap.docs[pageSize - 1].id : null;

    const studentIds = docs.map((d) => d.data().studentId as string);
    const linksSnap = await getDb().collection(COL_GUARDIAN_LINKS).where('campusId', '==', campusId).get();
    const linksByStudent = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();
    for (const link of linksSnap.docs) {
      const sid = link.data().studentId as string;
      if (!studentIds.includes(sid)) continue;
      const arr = linksByStudent.get(sid) ?? [];
      arr.push(link);
      linksByStudent.set(sid, arr);
    }

    const studentSnaps =
      studentIds.length > 0
        ? await getDb().getAll(...studentIds.map((id) => getDb().collection('students').doc(id)))
        : [];

    const studentById = new Map(studentSnaps.map((s) => [s.id, s]));

    const rows: CenterRosterRow[] = [];
    for (const enrDoc of docs) {
      const data = enrDoc.data();
      const studentId = data.studentId as string;
      let name = (data.studentName as string)?.trim();
      const stSnap = studentById.get(studentId);
      let householdId: string | undefined;
      if (stSnap?.exists) {
        if (!name) name = (stSnap.data()?.name as string) || studentId;
        householdId = stSnap.data()?.householdId as string | undefined;
      }
      if (!name) name = studentId;

      if (q && !name.toLowerCase().includes(q)) continue;

      const sectionId = (data.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      const linkDocs = linksByStudent.get(studentId) ?? [];
      const guardianUids = stSnap?.exists ? ((stSnap.data()?.guardianUids as string[]) ?? []) : [];
      const guardianLinked = linkDocs.length > 0 || guardianUids.length > 0;

      if (guardianFilter === 'linked' && !guardianLinked) continue;
      if (guardianFilter === 'unlinked' && guardianLinked) continue;

      let guardianSummary = '미연결';
      if (linkDocs.length > 0) {
        const names: string[] = [];
        for (const ld of linkDocs.slice(0, 2)) {
          const uid = ld.data().guardianUid as string;
          names.push(await resolveGuardianDisplay(uid));
        }
        guardianSummary = names.join(', ');
        if (linkDocs.length > 2) guardianSummary += ` 외 ${linkDocs.length - 2}`;
      } else if (guardianUids.length > 0) {
        guardianSummary = `연결 ${guardianUids.length}명`;
      }

      let enrollmentCodeStatus: CenterRosterRow['enrollmentCodeStatus'] = 'unknown';
      const codeSnap = await getDb()
        .collection('enrollmentCodes')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      if (!codeSnap.empty) {
        enrollmentCodeStatus = codeSnap.docs[0].data().used ? 'used' : 'unused';
      }

      const photoUrl = stSnap?.exists ? (stSnap.data()?.photoUrl as string | undefined) : undefined;

      rows.push({
        enrollmentId: enrDoc.id,
        studentId,
        name,
        photoUrl,
        sectionId,
        sectionLabel: sectionLabel(sectionLabels, sectionId),
        householdId,
        enrollmentCodeStatus,
        guardianSummary,
        guardianLinked,
      });
    }

    return { rows, nextCursor: rows.length > 0 ? nextCursor : null };
  },
);
