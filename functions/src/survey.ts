/**
 * 학부모 만족도 조사
 *   surveys/{programRunId}   title, intro, items[{id,label,question}], allowReview, consentLabel, opensAt, closesAt (Timestamp)
 *   surveyResponses/{programRunId}_{studentId}   programRunId, studentId, guardianUid, scores{itemId:1..5}, review, consentPublic, submittedAt
 *
 * 학부모: listPendingSurveys · getSurvey · submitSurvey (마감 전까지 고칠 수 있다)
 * 센터 · 통합 관리자: getSurveyResults (후기 전부 + 공개 동의 표시)
 * 통합 관리자: upsertProgramRunSurvey (기본 5문항으로 열기 · 기간 바꾸기)
 * 발주처 담당자: partnerApi.ts 의 getPartnerSurveyResults (공개 동의한 후기만, 이름 가림)
 * 규칙은 web/src/services/demo/survey.ts 와 같다.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { Timestamp } from 'firebase-admin/firestore';
import { assertCompanyAdmin } from './auth/assertCompanyAdmin';
import { readStaffClaims } from './auth/staffClaims';
import { getDb, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';
import { REGION, maskName, tsIso } from './lib/chatShared';
import { loadRun, loadStudents, normalizeSections, runTitle, type DocumentData } from './lib/runContext';

export const DEFAULT_SURVEY_ITEMS = [
  { id: 'overall', label: '전반 만족', question: '프로그램에 전반적으로 만족하시나요?' },
  { id: 'content', label: '수업 내용', question: '수업 내용이 아이에게 알맞았나요?' },
  { id: 'teacher', label: '강사', question: '선생님이 친절하고 잘 가르쳤나요?' },
  { id: 'operation', label: '운영·안내', question: '공지·장소·시간 안내가 편했나요?' },
  { id: 'again', label: '재참여 의향', question: '다음에도 이 프로그램에 참여하고 싶으신가요?' },
];
export const DEFAULT_CONSENT_LABEL = '후기를 사업 발주 기관(지자체)과 다른 학부모에게 공개해도 좋아요 (이름은 가려져요)';

type SurveyStatus = 'upcoming' | 'open' | 'closed';

function statusOf(s: DocumentData, now = Date.now()): SurveyStatus {
  const opens = new Date(tsIso(s.opensAt)).getTime();
  const closes = new Date(tsIso(s.closesAt)).getTime();
  if (now < opens) return 'upcoming';
  if (now > closes) return 'closed';
  return 'open';
}

/** 응답할 수 있는 학생 — 보호자가 연결된 수강생 (끝난 운영 건은 수료생 포함) */
async function eligibleStudents(programRunId: string, run: DocumentData): Promise<Map<string, DocumentData>> {
  const statuses = run.status === 'completed' ? ['completed', 'active'] : ['active'];
  const enr = await getDb().collection('studentProgramEnrollments').where('programRunId', '==', programRunId).get();
  const ids = enr.docs.map((d) => d.data()).filter((e) => statuses.includes((e.status as string) ?? 'active')).map((e) => e.studentId as string);
  const students = await loadStudents(ids);
  for (const [id, s] of students) if (((s.guardianUids as string[] | undefined) ?? []).length === 0) students.delete(id);
  return students;
}

function surveyDto(programRunId: string, run: DocumentData, s: DocumentData, student: { id: string; name: string }, r: DocumentData | undefined) {
  return {
    programRunId,
    programTitle: runTitle(run),
    studentId: student.id,
    studentName: student.name,
    title: (s.title as string) ?? '만족도 조사',
    intro: (s.intro as string) ?? '',
    items: (s.items as typeof DEFAULT_SURVEY_ITEMS | undefined) ?? DEFAULT_SURVEY_ITEMS,
    allowReview: s.allowReview !== false,
    consentLabel: (s.consentLabel as string) || DEFAULT_CONSENT_LABEL,
    opensAt: tsIso(s.opensAt),
    closesAt: tsIso(s.closesAt),
    status: statusOf(s),
    myResponse: r
      ? { scores: (r.scores as Record<string, number>) ?? {}, review: (r.review as string) ?? '', consentPublic: !!r.consentPublic, submittedAt: tsIso(r.submittedAt) }
      : null,
  };
}

function guardianUid(req: CallableRequest<unknown>): string {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  return uid;
}

export const listPendingSurveys = onCall(REGION, async (req: CallableRequest<Record<string, never>>) => {
  const uid = guardianUid(req);
  const db = getDb();
  const mine = await db.collection('students').where('guardianUids', 'array-contains', uid).get();
  const ids = mine.docs.map((d) => d.id);
  const enr: DocumentData[] = [];
  for (let i = 0; i < ids.length; i += 30) enr.push(...(await db.collection('studentProgramEnrollments').where('studentId', 'in', ids.slice(i, i + 30)).get()).docs.map((d) => d.data()));
  const runIds = [...new Set(enr.map((e) => e.programRunId as string))];
  const out = [];
  for (const runId of runIds) {
    const s = await db.collection('surveys').doc(runId).get();
    if (!s.exists || statusOf(s.data()!) !== 'open') continue;
    const run = await loadRun(runId).catch(() => null);
    if (!run) continue;
    const eligible = await eligibleStudents(runId, run);
    for (const st of mine.docs) {
      if (!eligible.has(st.id)) continue;
      const r = await db.collection('surveyResponses').doc(`${runId}_${st.id}`).get();
      if (r.exists) continue;
      out.push({ programRunId: runId, programTitle: runTitle(run), studentId: st.id, studentName: (st.data().name as string) ?? '', title: (s.data()!.title as string) ?? '만족도 조사', closesAt: tsIso(s.data()!.closesAt) });
    }
  }
  out.sort((a, b) => a.closesAt.localeCompare(b.closesAt) || a.studentName.localeCompare(b.studentName, 'ko'));
  return { surveys: out };
});

export const getSurvey = onCall(REGION, async (req: CallableRequest<{ studentId: string; programRunId: string }>) => {
  const uid = guardianUid(req);
  const studentId = req.data?.studentId?.trim();
  const programRunId = req.data?.programRunId?.trim();
  if (!studentId || !programRunId) throw new HttpsError('invalid-argument', 'studentId와 programRunId가 필요합니다.');
  const db = getDb();
  const st = await db.collection('students').doc(studentId).get();
  if (!st.exists || !((st.data()!.guardianUids as string[] | undefined) ?? []).includes(uid)) throw new HttpsError('permission-denied', '이 학생의 보호자만 응답할 수 있어요.');
  const s = await db.collection('surveys').doc(programRunId).get();
  if (!s.exists) return { survey: null };
  const run = await loadRun(programRunId);
  const r = await db.collection('surveyResponses').doc(`${programRunId}_${studentId}`).get();
  return { survey: surveyDto(programRunId, run, s.data()!, { id: studentId, name: (st.data()!.name as string) ?? '' }, r.exists ? r.data() : undefined) };
});

export const submitSurvey = onCall(
  REGION,
  async (req: CallableRequest<{ programRunId: string; studentId: string; scores: Record<string, number>; review?: string; consentPublic?: boolean }>) => {
    const uid = guardianUid(req);
    const programRunId = req.data?.programRunId?.trim();
    const studentId = req.data?.studentId?.trim();
    if (!programRunId || !studentId) throw new HttpsError('invalid-argument', 'studentId와 programRunId가 필요합니다.');
    const db = getDb();
    const s = await db.collection('surveys').doc(programRunId).get();
    if (!s.exists) throw new HttpsError('not-found', '만족도 조사를 찾을 수 없어요.');
    const survey = s.data()!;
    if (statusOf(survey) !== 'open') throw new HttpsError('failed-precondition', '응답 기간이 아니에요.');
    const st = await db.collection('students').doc(studentId).get();
    if (!st.exists || !((st.data()!.guardianUids as string[] | undefined) ?? []).includes(uid)) throw new HttpsError('permission-denied', '이 학생의 보호자만 응답할 수 있어요.');
    const run = await loadRun(programRunId);
    if (!(await eligibleStudents(programRunId, run)).has(studentId)) throw new HttpsError('failed-precondition', '이 프로그램 수강생이 아니에요.');
    const items = (survey.items as typeof DEFAULT_SURVEY_ITEMS | undefined) ?? DEFAULT_SURVEY_ITEMS;
    const scores: Record<string, number> = {};
    for (const it of items) {
      const v = req.data?.scores?.[it.id];
      if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > 5) throw new HttpsError('invalid-argument', `‘${it.label}’ 점수를 골라 주세요.`);
      scores[it.id] = v as number;
    }
    const review = survey.allowReview !== false && typeof req.data?.review === 'string' ? req.data.review.trim().slice(0, 500) : '';
    await db
      .collection('surveyResponses')
      .doc(`${programRunId}_${studentId}`)
      .set({ programRunId, studentId, guardianUid: uid, scores, review, consentPublic: !!review && !!req.data?.consentPublic, submittedAt: Timestamp.now() });
    return { ok: true };
  },
);

/** 결과 — publicOnly: 공개 동의한 후기만 (발주처) · mask: 이름 가림 */
export async function surveyResultsFor(programRunId: string, opts: { publicOnly: boolean; mask: boolean }) {
  const db = getDb();
  const s = await db.collection('surveys').doc(programRunId).get();
  if (!s.exists) return null;
  const survey = s.data()!;
  const run = await loadRun(programRunId);
  const items = (survey.items as typeof DEFAULT_SURVEY_ITEMS | undefined) ?? DEFAULT_SURVEY_ITEMS;
  const [resp, eligible, enr] = await Promise.all([
    db.collection('surveyResponses').where('programRunId', '==', programRunId).get(),
    eligibleStudents(programRunId, run),
    db.collection('studentProgramEnrollments').where('programRunId', '==', programRunId).get(),
  ]);
  const responses = resp.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<DocumentData & { id: string }>;
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);
  const labels = new Map(normalizeSections(run).map((x) => [x.id, x.label]));
  const sectionOf = new Map(enr.docs.map((d) => [d.data().studentId as string, (d.data().sectionId as string) || UNASSIGNED_SECTION_ID]));
  const students = await loadStudents(responses.map((r) => r.studentId as string));
  return {
    programRunId,
    title: (survey.title as string) ?? '만족도 조사',
    status: statusOf(survey),
    opensAt: tsIso(survey.opensAt),
    closesAt: tsIso(survey.closesAt),
    eligible: eligible.size,
    responses: responses.length,
    overallAvg: avg(responses.flatMap((r) => Object.values((r.scores as Record<string, number>) ?? {}))),
    items: items.map((it) => {
      const vals = responses.map((r) => (r.scores as Record<string, number> | undefined)?.[it.id]).filter((v): v is number => typeof v === 'number');
      return { id: it.id, label: it.label, question: it.question, avg: avg(vals), distribution: [1, 2, 3, 4, 5].map((n) => vals.filter((v) => v === n).length) };
    }),
    reviews: responses
      .filter((r) => r.review && (!opts.publicOnly || r.consentPublic))
      .sort((a, b) => tsIso(b.submittedAt).localeCompare(tsIso(a.submittedAt)))
      .map((r) => {
        const raw = (students.get(r.studentId as string)?.name as string | undefined) ?? '';
        const name = raw ? (opts.mask || opts.publicOnly ? maskName(raw) : raw) : '학생';
        const sec = labels.get(sectionOf.get(r.studentId as string) ?? '') ?? '';
        return { id: r.id, text: r.review as string, studentLabel: `${name} 학부모${sec ? ` · ${sec}` : ''}`, submittedAt: tsIso(r.submittedAt), consentPublic: !!r.consentPublic };
      }),
  };
}

export const getSurveyResults = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const programRunId = req.data?.programRunId?.trim();
  if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
  const run = await loadRun(programRunId);
  const c = readStaffClaims(req);
  if (!(c.companyAdmin || (c.centerAdmin && c.campusIds.includes(run.campusId as string)))) throw new HttpsError('permission-denied', '이 캠퍼스에 대한 권한이 없습니다.');
  return { results: await surveyResultsFor(programRunId, { publicOnly: false, mask: false }) };
});

/** 통합 관리자 — 조사 열기 · 기간 바꾸기 (문항은 기본 5문항) */
export const upsertProgramRunSurvey = onCall(
  REGION,
  async (req: CallableRequest<{ programRunId: string; title?: string; intro?: string; opensAt: string; closesAt: string }>) => {
    assertCompanyAdmin(req);
    const programRunId = req.data?.programRunId?.trim();
    if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
    const run = await loadRun(programRunId);
    const opens = new Date(req.data.opensAt);
    const closes = new Date(req.data.closesAt);
    if (Number.isNaN(opens.getTime()) || Number.isNaN(closes.getTime()) || closes <= opens) throw new HttpsError('invalid-argument', '기간이 올바르지 않아요.');
    const ref = getDb().collection('surveys').doc(programRunId);
    const prev = await ref.get();
    await ref.set(
      {
        programRunId,
        title: req.data.title?.trim() || `${runTitle(run)} 만족도 조사`,
        intro: req.data.intro?.trim() ?? '아이의 수업 경험을 들려주세요. 1분이면 끝나요.',
        items: prev.exists ? (prev.data()!.items ?? DEFAULT_SURVEY_ITEMS) : DEFAULT_SURVEY_ITEMS,
        allowReview: true,
        consentLabel: DEFAULT_CONSENT_LABEL,
        opensAt: Timestamp.fromDate(opens),
        closesAt: Timestamp.fromDate(closes),
        updatedAt: Timestamp.now(),
        ...(prev.exists ? {} : { createdAt: Timestamp.now() }),
      },
      { merge: true },
    );
    return { ok: true };
  },
);
