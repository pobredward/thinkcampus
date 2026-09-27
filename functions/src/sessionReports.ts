/**
 * 회차 리포트 — 강사 작성(draft) → 센터 검수(submitted) → [회사 승인(reviewed)] → 학부모 공개(published)
 *   listSessionReports · saveSessionReportDrafts · submitSessionReports · reviewSessionReports
 * 문서: sessionReports/{runSessionId__studentId}
 */
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';
import { assertCanWorkSession, canSeeCampus, readStaffClaims } from './auth/staffClaims';
import { getDb } from './lib/centerRunHelpers';
import { loadRunContext, loadStaff, loadStudents, requireCompanyApproval, tsToIso, type RunContext } from './lib/runContext';

export type SessionReportStatus = 'draft' | 'submitted' | 'reviewed' | 'published';
export type ReportReviewAction = 'publish' | 'approve' | 'return';

interface ListRequest {
  programRunId?: string;
  runSessionId?: string;
  sectionId?: string;
  status?: SessionReportStatus | 'pending';
}

async function rowsForRun(ctx: RunContext, filter: ListRequest) {
  const approval = requireCompanyApproval(ctx.run);
  const sessions = new Map(ctx.sessions.map((s) => [s.id, s]));
  const entries = [...ctx.reports.entries()].filter(([, r]) => {
    if (filter.runSessionId && r.runSessionId !== filter.runSessionId) return false;
    if (filter.status === 'pending') return r.status === 'submitted' || (approval && r.status === 'reviewed');
    if (filter.status && r.status !== filter.status) return false;
    return true;
  });
  const students = await loadStudents(entries.map(([, r]) => r.studentId as string));
  const staff = await loadStaff(entries.map(([, r]) => (r.instructorId as string) ?? ''));
  const rows = [];
  for (const [id, r] of entries) {
    const rs = sessions.get(r.runSessionId as string);
    if (!rs) continue;
    if (filter.sectionId && rs.sectionId !== filter.sectionId) continue;
    const att = ctx.attendance.get(id);
    rows.push({
      id,
      runSessionId: rs.id,
      programRunId: ctx.runId,
      studentId: r.studentId as string,
      studentName: (students.get(r.studentId as string)?.name as string) ?? (r.studentId as string),
      sectionLabel: ctx.sectionLabel(rs.sectionId),
      sessionNumber: rs.sessionNumber,
      scheduledDate: rs.scheduledDate,
      topic: rs.topic,
      instructorId: (r.instructorId as string | null) ?? null,
      instructorName: r.instructorId ? staff.get(r.instructorId as string)?.displayName ?? '강사' : '미배정',
      status: r.status as SessionReportStatus,
      attendanceStatus: att?.status as 'present' | 'late' | 'absent' | undefined,
      participationScore: typeof r.participationScore === 'number' ? (r.participationScore as number) : null,
      homeworkDone: typeof r.homeworkDone === 'boolean' ? (r.homeworkDone as boolean) : null,
      feedback: (r.feedback as string) ?? '',
      highlights: (r.highlights as string[]) ?? [],
      improvements: (r.improvements as string[]) ?? [],
      submittedAt: tsToIso(r.submittedAt),
      reviewedAt: tsToIso(r.reviewedAt),
      publishedAt: tsToIso(r.publishedAt),
      returnNote: r.returnNote as string | undefined,
    });
  }
  rows.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate) || a.sectionLabel.localeCompare(b.sectionLabel, 'ko') || a.studentName.localeCompare(b.studentName, 'ko'));
  return rows;
}

export const listSessionReports = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<ListRequest>) => {
    const claims = readStaffClaims(req);
    const filter = req.data ?? {};
    let runIds: string[] = [];
    if (filter.programRunId) runIds = [filter.programRunId];
    else if (filter.runSessionId) {
      const s = await getDb().collection('runSessions').doc(filter.runSessionId).get();
      if (!s.exists) throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
      runIds = [s.data()!.programRunId as string];
    } else {
      // 운영 건 지정이 없으면 (회사 승인 대기 목록 등) 진행 중 운영 건 전체
      const snap = await getDb().collection('programRuns').where('status', 'in', ['active', 'scheduled']).get();
      runIds = snap.docs.map((d) => d.id);
    }
    const reports = [];
    for (const runId of runIds) {
      const ctx = await loadRunContext(runId);
      if (!canSeeCampus(claims, ctx.run.campusId as string)) {
        if (filter.programRunId || filter.runSessionId) throw new HttpsError('permission-denied', '이 캠퍼스에 대한 권한이 없습니다.');
        continue;
      }
      reports.push(...(await rowsForRun(ctx, filter)));
    }
    return { reports };
  },
);

interface DraftInput {
  runSessionId: string;
  studentId: string;
  participationScore: number | null;
  homeworkDone: boolean | null;
  feedback: string;
  highlights: string[];
  improvements: string[];
}

export const saveSessionReportDrafts = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ drafts: DraftInput[] }>) => {
    const drafts = req.data?.drafts;
    if (!Array.isArray(drafts) || drafts.length === 0) throw new HttpsError('invalid-argument', 'drafts 가 필요합니다.');
    const db = getDb();
    const batch = db.batch();
    const sessCache = new Map<string, FirebaseFirestore.DocumentData>();
    for (const d of drafts) {
      if (!d.runSessionId || !d.studentId) throw new HttpsError('invalid-argument', 'runSessionId, studentId 가 필요합니다.');
      let sess = sessCache.get(d.runSessionId);
      if (!sess) {
        const s = await db.collection('runSessions').doc(d.runSessionId).get();
        if (!s.exists) throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
        sess = s.data()!;
        const run = await db.collection('programRuns').doc(sess.programRunId as string).get();
        assertCanWorkSession(req, run.data()!.campusId as string, (sess.instructorId as string | undefined) || null);
        sessCache.set(d.runSessionId, sess);
      }
      const ref = db.collection('sessionReports').doc(`${d.runSessionId}__${d.studentId}`);
      const existing = await ref.get();
      if (existing.exists && existing.data()!.status !== 'draft') {
        throw new HttpsError('failed-precondition', '이미 제출한 리포트는 센터가 반려한 뒤에만 고칠 수 있어요.');
      }
      const clean = (arr: unknown) => (Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 10) : []);
      batch.set(
        ref,
        {
          runSessionId: d.runSessionId,
          programRunId: sess.programRunId,
          studentId: d.studentId,
          instructorId: (sess.instructorId as string | undefined) || req.auth!.uid,
          status: 'draft',
          participationScore: typeof d.participationScore === 'number' ? Math.min(100, Math.max(0, d.participationScore)) : null,
          homeworkDone: typeof d.homeworkDone === 'boolean' ? d.homeworkDone : null,
          feedback: String(d.feedback ?? '').trim().slice(0, 1000),
          highlights: clean(d.highlights),
          improvements: clean(d.improvements),
          updatedAt: FieldValue.serverTimestamp(),
          ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true },
      );
    }
    await batch.commit();
    return { saved: drafts.length };
  },
);

export const submitSessionReports = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ runSessionId: string }>) => {
    const runSessionId = req.data?.runSessionId?.trim();
    if (!runSessionId) throw new HttpsError('invalid-argument', 'runSessionId가 필요합니다.');
    const db = getDb();
    const sessSnap = await db.collection('runSessions').doc(runSessionId).get();
    if (!sessSnap.exists) throw new HttpsError('not-found', '회차를 찾을 수 없습니다.');
    const sess = sessSnap.data()!;
    const ctx = await loadRunContext(sess.programRunId as string);
    assertCanWorkSession(req, ctx.run.campusId as string, (sess.instructorId as string | undefined) || null);
    const rs = ctx.sessions.find((s) => s.id === runSessionId)!;
    const attended = ctx.activeEnrollments(rs.sectionId).filter((e) => ctx.attendance.has(`${rs.id}__${e.studentId}`));
    if (attended.length === 0) throw new HttpsError('failed-precondition', '출결을 먼저 입력해 주세요.');
    const students = await loadStudents(attended.map((e) => e.studentId));
    const batch = db.batch();
    let submitted = 0;
    for (const e of attended) {
      const key = `${rs.id}__${e.studentId}`;
      const r = ctx.reports.get(key);
      if (!r || r.status !== 'draft') continue;
      const att = ctx.attendance.get(key)!;
      if (att.status !== 'absent' && !String(r.feedback ?? '').trim()) {
        throw new HttpsError('failed-precondition', `${(students.get(e.studentId)?.name as string) ?? e.studentId} 학생의 피드백을 입력해 주세요.`);
      }
      batch.update(db.collection('sessionReports').doc(key), {
        status: 'submitted',
        submittedAt: FieldValue.serverTimestamp(),
        returnNote: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      submitted += 1;
    }
    if (submitted === 0) throw new HttpsError('failed-precondition', '제출할 리포트가 없어요.');
    await batch.commit();
    return { submitted };
  },
);

export const reviewSessionReports = onCall(
  { region: 'asia-northeast3', maxInstances: 10 },
  async (req: CallableRequest<{ reportIds: string[]; action: ReportReviewAction; note?: string }>) => {
    const claims = readStaffClaims(req);
    const ids = req.data?.reportIds;
    const action = req.data?.action;
    if (!Array.isArray(ids) || ids.length === 0 || !['publish', 'approve', 'return'].includes(action)) {
      throw new HttpsError('invalid-argument', 'reportIds, action(publish|approve|return)이 필요합니다.');
    }
    const db = getDb();
    const batch = db.batch();
    const runCache = new Map<string, FirebaseFirestore.DocumentData>();
    for (const id of ids) {
      const ref = db.collection('sessionReports').doc(id);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', `리포트를 찾을 수 없습니다: ${id}`);
      const r = snap.data()!;
      const runId = r.programRunId as string;
      let run = runCache.get(runId);
      if (!run) {
        const rs = await db.collection('programRuns').doc(runId).get();
        run = rs.data()!;
        runCache.set(runId, run);
      }
      const campusId = run.campusId as string;
      const isCenter = claims.centerAdmin && claims.campusIds.includes(campusId);
      if (!claims.companyAdmin && !isCenter) throw new HttpsError('permission-denied', '이 캠퍼스에 대한 권한이 없습니다.');
      const approval = requireCompanyApproval(run);
      const status = r.status as SessionReportStatus;
      const now = FieldValue.serverTimestamp();

      if (action === 'return') {
        if (status === 'published') throw new HttpsError('failed-precondition', '이미 공개된 리포트는 반려할 수 없어요.');
        batch.update(ref, { status: 'draft', returnNote: req.data.note?.trim() || '내용을 보완해 주세요.', submittedAt: FieldValue.delete(), reviewedAt: FieldValue.delete(), updatedAt: now });
        continue;
      }
      if (action === 'approve') {
        if (status !== 'submitted') throw new HttpsError('failed-precondition', '검수 대기 상태의 리포트만 승인 요청할 수 있어요.');
        if (!approval) throw new HttpsError('failed-precondition', '이 운영 건은 회사 승인 없이 바로 공개할 수 있어요.');
        batch.update(ref, { status: 'reviewed', reviewedAt: now, reviewedByUid: claims.uid, returnNote: FieldValue.delete(), updatedAt: now });
        continue;
      }
      // publish
      if (claims.companyAdmin) {
        if (status !== 'reviewed' && status !== 'submitted') throw new HttpsError('failed-precondition', '승인 대기 상태의 리포트만 공개할 수 있어요.');
      } else {
        if (status !== 'submitted') throw new HttpsError('failed-precondition', '검수 대기 상태의 리포트만 공개할 수 있어요.');
        if (approval) throw new HttpsError('failed-precondition', '이 운영 건은 회사 승인 후 공개돼요. 승인 요청을 눌러 주세요.');
      }
      batch.update(ref, { status: 'published', reviewedAt: r.reviewedAt ?? now, publishedAt: now, publishedByUid: claims.uid, returnNote: FieldValue.delete(), updatedAt: now });
      // 학부모 앱: 출결 문서에 피드백을 같이 두면 sessionAttendance 만 읽는 기존 화면도 그대로 쓴다
      batch.set(
        db.collection('sessionAttendance').doc(id),
        {
          participationScore: typeof r.participationScore === 'number' ? r.participationScore : FieldValue.delete(),
          homeworkDone: typeof r.homeworkDone === 'boolean' ? r.homeworkDone : null,
          feedback: (r.feedback as string) ?? '',
          highlights: (r.highlights as string[]) ?? [],
          improvements: (r.improvements as string[]) ?? [],
          updatedAt: now,
        },
        { merge: true },
      );
      const sess = await db.collection('runSessions').doc(r.runSessionId as string).get();
      const student = await db.collection('students').doc(r.studentId as string).get();
      batch.set(db.collection('notifications').doc(`rep-${id}`), {
        type: 'report',
        title: `${(student.data()?.name as string) ?? '학생'} ${sess.data()?.sessionNumber ?? ''}회차 리포트 도착`,
        body: `‘${(sess.data()?.topic as string) ?? '수업'}’ 수업의 선생님 피드백이 올라왔어요.`,
        programRunId: runId,
        campusId,
        studentId: r.studentId,
        channel: '앱 알림',
        createdByUid: claims.uid,
        createdAt: now,
      });
    }
    await batch.commit();
    return { updated: ids.length };
  },
);
