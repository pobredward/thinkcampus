import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import type { DocumentData } from 'firebase-admin/firestore';
import { assertCenterStaffForCampus } from './auth/assertCenterStaff';
import { getDb, todayKstDate, sessionTopic, resolveStaffName, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';

export interface ListCenterScheduleRequest {
  programRunId: string;
  dateFrom?: string;
  dateTo?: string;
}

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

export interface ListCenterScheduleResponse {
  days: CenterScheduleDay[];
}

function sectionLabelMap(run: DocumentData): Map<string, string> {
  const map = new Map<string, string>();
  if (Array.isArray(run.sections)) {
    for (const item of run.sections) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const id = String(row.id ?? '').trim();
      const label = String(row.label ?? '').trim();
      if (id && label) map.set(id, label);
    }
  }
  return map;
}

export const listCenterSchedule = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<ListCenterScheduleRequest>): Promise<ListCenterScheduleResponse> => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) {
      throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    }

    const runSnap = await getDb().collection('programRuns').doc(programRunId).get();
    if (!runSnap.exists) {
      throw new HttpsError('not-found', '운영 건을 찾을 수 없습니다.');
    }
    const run = runSnap.data()!;
    const campusId = run.campusId as string;
    const runLocation = (run.location as string) || '';
    assertCenterStaffForCampus(req, campusId);

    const today = todayKstDate();
    const dateFrom = req.data?.dateFrom?.trim() || today;
    const dateTo = req.data?.dateTo?.trim() || dateFrom;

    const sectionLabels = sectionLabelMap(run);

    const [enrSnap, sessSnap, attSnap] = await Promise.all([
      getDb().collection('studentProgramEnrollments').where('programRunId', '==', programRunId).get(),
      getDb()
        .collection('runSessions')
        .where('programRunId', '==', programRunId)
        .orderBy('sessionNumber', 'asc')
        .get(),
      getDb().collection('sessionAttendance').where('programRunId', '==', programRunId).get(),
    ]);

    const sectionCounts = new Map<string, number>();
    for (const doc of enrSnap.docs) {
      const sectionId = (doc.data().sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      sectionCounts.set(sectionId, (sectionCounts.get(sectionId) ?? 0) + 1);
    }

    const attBySession = new Map<string, number>();
    for (const doc of attSnap.docs) {
      const rsid = doc.data().runSessionId as string;
      if (!rsid) continue;
      attBySession.set(rsid, (attBySession.get(rsid) ?? 0) + 1);
    }

    const instructorIds = new Set<string>();
    const dayMap = new Map<string, Map<string, CenterScheduleSession[]>>();

    for (const doc of sessSnap.docs) {
      const s = doc.data();
      if ((s.status as string) === 'cancelled') continue;
      const scheduledDate = s.scheduledDate as string;
      if (scheduledDate < dateFrom || scheduledDate > dateTo) continue;

      const startTime = (s.startTime as string) || (run.startTime as string) || '';
      const endTime = (s.endTime as string) || (run.endTime as string) || '';
      const sectionId = (s.sectionId as string)?.trim() || UNASSIGNED_SECTION_ID;
      const enrolledCount = sectionCounts.get(sectionId) ?? enrSnap.size;
      const recordedCount = attBySession.get(doc.id) ?? 0;
      const instructorId = (s.instructorId as string | undefined) ?? null;
      if (instructorId) instructorIds.add(instructorId);
      const session: CenterScheduleSession = {
        id: doc.id,
        sessionNumber: s.sessionNumber as number,
        topic: sessionTopic(s),
        sectionId,
        sectionLabel: sectionLabels.get(sectionId) ?? (sectionId === UNASSIGNED_SECTION_ID ? '미배정' : sectionId),
        startTime,
        endTime,
        location: (s.location as string) || runLocation,
        instructorId,
        enrolledCount,
        recordedCount,
        attendanceRate: enrolledCount > 0 ? recordedCount / enrolledCount : 0,
      };

      if (!dayMap.has(scheduledDate)) dayMap.set(scheduledDate, new Map());
      const slotKey = `${startTime}__${endTime}`;
      const slots = dayMap.get(scheduledDate)!;
      const list = slots.get(slotKey) ?? [];
      list.push(session);
      slots.set(slotKey, list);
    }

    const instructorNames = new Map<string, string>();
    await Promise.all(
      [...instructorIds].map(async (id) => {
        instructorNames.set(id, (await resolveStaffName(id)).name);
      }),
    );

    for (const [, slots] of dayMap) {
      for (const [, sessions] of slots) {
        for (const sess of sessions) {
          const doc = sessSnap.docs.find((d) => d.id === sess.id);
          const iid = doc?.data().instructorId as string | undefined;
          if (iid) sess.instructorName = instructorNames.get(iid);
        }
        sessions.sort((a, b) => a.sectionLabel.localeCompare(b.sectionLabel, 'ko'));
      }
    }

    const days: CenterScheduleDay[] = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, slots]) => ({
        date,
        slots: [...slots.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, sessions]) => {
            const [startTime, endTime] = key.split('__');
            return { startTime, endTime, sessions };
          }),
      }));

    return { days };
  },
);
