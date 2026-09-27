/**
 * 학부모 알림 — 내 자녀의 운영 건 공지 + 자녀 출결·리포트 알림. 읽음은 notificationReads/{uid}_{id}
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from './lib/centerRunHelpers';
import { tsToIso } from './lib/runContext';

export const listGuardianNotifications = onCall(
  { region: 'asia-northeast3', maxInstances: 15 },
  async (req: CallableRequest<Record<string, never>>) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    const db = getDb();
    const students = await db.collection('students').where('guardianUids', 'array-contains', uid).get();
    const studentIds = students.docs.map((d) => d.id);
    if (studentIds.length === 0) return { notifications: [] };
    const enr = await db.collection('studentProgramEnrollments').where('studentId', 'in', studentIds.slice(0, 30)).get();
    const runSections = new Map<string, Set<string>>();
    for (const d of enr.docs) {
      const runId = d.data().programRunId as string;
      const set = runSections.get(runId) ?? new Set<string>();
      set.add((d.data().sectionId as string) ?? '');
      runSections.set(runId, set);
    }
    const runIds = [...runSections.keys()];
    const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (let i = 0; i < runIds.length; i += 30) {
      const snap = await db.collection('notifications').where('programRunId', 'in', runIds.slice(i, i + 30)).get();
      docs.push(...snap.docs);
    }
    const reads = await db.collection('notificationReads').where('uid', '==', uid).get();
    const readIds = new Set(reads.docs.map((d) => d.data().notificationId as string));
    const notifications = docs
      .filter((d) => {
        const n = d.data();
        if (n.studentId) return studentIds.includes(n.studentId as string);
        if (n.sectionId) return runSections.get(n.programRunId as string)?.has(n.sectionId as string);
        return true;
      })
      .map((d) => {
        const n = d.data();
        const iso = tsToIso(n.createdAt) ?? '';
        return {
          id: d.id,
          type: ((n.type as string) ?? 'notice') as 'attendance' | 'report' | 'schedule' | 'notice',
          title: (n.title as string) ?? '',
          body: (n.body as string) ?? '',
          date: iso.slice(0, 10).replace(/-/g, '.'),
          isRead: readIds.has(d.id),
          _sort: iso,
        };
      })
      .sort((a, b) => b._sort.localeCompare(a._sort))
      .slice(0, 100)
      .map(({ _sort, ...n }) => {
        void _sort;
        return n;
      });
    return { notifications };
  },
);

export const markNotificationRead = onCall(
  { region: 'asia-northeast3', maxInstances: 15 },
  async (req: CallableRequest<{ notificationId: string }>) => {
    const uid = req.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    const id = req.data?.notificationId?.trim();
    if (!id) throw new HttpsError('invalid-argument', 'notificationId가 필요합니다.');
    await getDb().collection('notificationReads').doc(`${uid}_${id}`).set({ uid, notificationId: id, readAt: FieldValue.serverTimestamp() });
    return { ok: true };
  },
);
