/**
 * 센터 공지 — 보내기 / 보낸 공지 목록. 보호자 앱 알림(notifications)에 바로 나타난다.
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { assertCenterOrCompanyForCampus } from './auth/staffClaims';
import { getDb } from './lib/centerRunHelpers';
import { loadRunContext, loadStaff, loadStudents, tsToIso } from './lib/runContext';

export interface CreateCenterNoticeRequest {
  programRunId: string;
  title: string;
  body?: string;
  sectionId?: string;
}

export const createCenterNotice = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<CreateCenterNoticeRequest>): Promise<{ notificationId: string; recipients: number }> => {
    const programRunId = req.data?.programRunId?.trim();
    const title = req.data?.title?.trim();
    const body = req.data?.body?.trim() ?? '';
    const sectionId = req.data?.sectionId?.trim() || undefined;
    if (!programRunId || !title) throw new HttpsError('invalid-argument', 'programRunId와 title이 필요합니다.');
    if (title.length > 200) throw new HttpsError('invalid-argument', '제목은 200자 이하입니다.');

    const ctx = await loadRunContext(programRunId, { attendance: false, reports: false });
    const claims = assertCenterOrCompanyForCampus(req, ctx.run.campusId as string);
    if (sectionId && !ctx.sections.some((s) => s.id === sectionId)) throw new HttpsError('not-found', '반을 찾을 수 없습니다.');

    const targets = ctx.activeEnrollments(sectionId);
    const students = await loadStudents(targets.map((e) => e.studentId));
    const uids = new Set<string>();
    for (const e of targets) for (const uid of (students.get(e.studentId)?.guardianUids as string[] | undefined) ?? []) uids.add(uid);

    const ref = getDb().collection('notifications').doc();
    await ref.set({
      type: 'notice',
      title,
      body,
      programRunId,
      campusId: ctx.run.campusId,
      ...(sectionId ? { sectionId } : {}),
      recipients: uids.size,
      channel: '앱 알림',
      createdByUid: claims.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { notificationId: ref.id, recipients: uids.size };
  },
);

export const listCenterNotifications = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ programRunId: string }>) => {
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    const ctx = await loadRunContext(programRunId, { attendance: false, reports: false });
    assertCenterOrCompanyForCampus(req, ctx.run.campusId as string);
    const snap = await getDb().collection('notifications').where('programRunId', '==', programRunId).where('type', '==', 'notice').get();
    const staff = await loadStaff(snap.docs.map((d) => (d.data().createdByUid as string) ?? ''));
    const notifications = snap.docs
      .map((d) => {
        const n = d.data();
        return {
          id: d.id,
          type: 'notice' as const,
          title: (n.title as string) ?? '',
          body: (n.body as string) ?? '',
          sectionId: n.sectionId as string | undefined,
          sectionLabel: n.sectionId ? ctx.sectionLabel(n.sectionId as string) : undefined,
          createdAt: tsToIso(n.createdAt) ?? '',
          createdByName: staff.get(n.createdByUid as string)?.displayName ?? '센터',
          recipients: (n.recipients as number) ?? 0,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { notifications };
  },
);
