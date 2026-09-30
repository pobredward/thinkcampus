/**
 * 민원 · 문의 장부 — inquiries/{id}
 *   센터(프로그램 매니저): 채팅 메시지를 민원으로 등록 · 전화/현장 접수 기록 · 상태 · 처리 내용
 *   통합 관리자: 전체 열람 · 처리
 *   발주처 담당자: partnerApi.ts 에서 자기 운영 건만 (원문 + 처리 내용, 이름은 운영 건 설정에 따라 가림)
 *   학부모: 채팅방(getChatRoom)에서 자기 방 민원만
 *
 * Callable: listInquiries · getInquiry · fileInquiry · updateInquiry
 * (web/src/services/demo/chat.ts 의 fileInquiryInWorld · updateInquiryInWorld 와 같은 규칙)
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readStaffClaims, type StaffClaims } from './auth/staffClaims';
import { getDb, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';
import {
  INQUIRY_CATEGORIES,
  REGION,
  maskName,
  tsIso,
  type InquiryCategory,
  type InquiryChannel,
  type InquiryKind,
  type InquiryStatus,
} from './lib/chatShared';
import { loadRun, loadStaff, loadStudents, normalizeSections, runTitle, type DocumentData } from './lib/runContext';

export interface InquiryDto {
  id: string;
  programRunId: string;
  programTitle: string;
  campusId: string;
  studentId?: string;
  studentLabel: string;
  reporterLabel: string;
  kind: InquiryKind;
  category: InquiryCategory;
  channel: InquiryChannel;
  title: string;
  body: string;
  photoUrls: string[];
  status: InquiryStatus;
  resolution?: string;
  resolvedAt?: string;
  resolvedByName?: string;
  officerNote?: string;
  satisfaction?: number;
  chatRoomId?: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{ at: string; status: InquiryStatus; note?: string; byName: string }>;
}

interface HistoryRow {
  at: Timestamp | string;
  status: InquiryStatus;
  note?: string;
  byUid: string;
}

/** 민원 문서 여러 개 → 화면용 (학생 이름 · 반 · 직원 이름을 한 번에 읽는다) */
export async function inquiryDtos(docs: Array<{ id: string; data: DocumentData }>, opts: { mask?: boolean | ((runId: string) => boolean) } = {}): Promise<InquiryDto[]> {
  if (docs.length === 0) return [];
  const db = getDb();
  const runIds = [...new Set(docs.map((d) => d.data.programRunId as string))];
  const runs = new Map<string, DocumentData>();
  const sectionOf = new Map<string, string>(); // `${runId}/${studentId}` → 반 이름
  await Promise.all(
    runIds.map(async (id) => {
      const run = await loadRun(id).catch(() => null);
      if (!run) return;
      runs.set(id, run);
      const labels = new Map(normalizeSections(run).map((s) => [s.id, s.label]));
      const enr = await db.collection('studentProgramEnrollments').where('programRunId', '==', id).get();
      for (const e of enr.docs) {
        const d = e.data();
        const sid = (d.sectionId as string) || UNASSIGNED_SECTION_ID;
        sectionOf.set(`${id}/${d.studentId as string}`, labels.get(sid) ?? (sid === UNASSIGNED_SECTION_ID ? '' : sid));
      }
    }),
  );
  const students = await loadStudents(docs.map((d) => (d.data.studentId as string) ?? '').filter(Boolean));
  const staffUids = new Set<string>();
  for (const d of docs) {
    for (const h of (d.data.history as HistoryRow[] | undefined) ?? []) staffUids.add(h.byUid);
    if (d.data.resolvedByUid) staffUids.add(d.data.resolvedByUid as string);
  }
  const staff = await loadStaff([...staffUids]);

  return docs.map(({ id, data: q }) => {
    const runId = q.programRunId as string;
    const run = runs.get(runId);
    const mask = typeof opts.mask === 'function' ? opts.mask(runId) : !!opts.mask;
    const studentId = (q.studentId as string | undefined) || undefined;
    const rawName = studentId ? ((students.get(studentId)?.name as string | undefined) ?? '') : '';
    const name = rawName ? (mask ? maskName(rawName) : rawName) : '';
    const section = studentId ? sectionOf.get(`${runId}/${studentId}`) : undefined;
    const studentLabel = studentId ? `${name || '학생'}${section ? ` (${section})` : ''}` : '학생 미지정';
    const channel = ((q.channel as string) ?? 'chat') as InquiryChannel;
    const guardianUid = q.guardianUid as string | undefined;
    const who = (uid: string) => (guardianUid && uid === guardianUid ? '보호자' : (staff.get(uid)?.displayName ?? '담당자'));
    const staffName = (uid: string | undefined) => {
      if (!uid) return undefined;
      const p = staff.get(uid);
      return p && p.displayName !== uid ? p.displayName : '담당자';
    };
    return {
      id,
      programRunId: runId,
      programTitle: run ? runTitle(run) : runId,
      campusId: q.campusId as string,
      studentId,
      studentLabel,
      reporterLabel: channel === 'chat' ? `${name ? `${name} ` : ''}보호자 · 앱 채팅` : `보호자 · ${channel === 'phone' ? '전화' : '현장'} 접수`,
      kind: ((q.kind as string) === 'question' ? 'question' : 'complaint') as InquiryKind,
      category: (INQUIRY_CATEGORIES as readonly string[]).includes(q.category as string) ? (q.category as InquiryCategory) : 'etc',
      channel,
      title: (q.title as string) ?? '',
      body: (q.body as string) ?? '',
      photoUrls: [],
      status: ((q.status as string) ?? 'received') as InquiryStatus,
      resolution: (q.resolution as string | undefined) || undefined,
      resolvedAt: q.resolvedAt ? tsIso(q.resolvedAt) : undefined,
      resolvedByName: staffName(q.resolvedByUid as string | undefined),
      officerNote: (q.officerNote as string | undefined) || undefined,
      satisfaction: typeof q.satisfaction === 'number' ? (q.satisfaction as number) : undefined,
      chatRoomId: (q.chatRoomId as string | undefined) || undefined,
      createdAt: tsIso(q.createdAt),
      updatedAt: tsIso(q.updatedAt),
      history: ((q.history as HistoryRow[] | undefined) ?? []).map((h) => ({ at: tsIso(h.at), status: h.status, note: h.note, byName: who(h.byUid) })),
    };
  });
}

/** 사진 — chatPhotos 문서(data URL)를 읽어 붙인다 (민원 상세 · 채팅방) */
export async function loadPhotos(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const uniq = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < uniq.length; i += 100) {
    const snaps = await getDb().getAll(...uniq.slice(i, i + 100).map((id) => getDb().collection('chatPhotos').doc(id)));
    for (const s of snaps) if (s.exists) out.set(s.id, (s.data()!.dataUrl as string) ?? '');
  }
  return out;
}

/** 센터(자기 캠퍼스) · 통합 관리자 */
function assertInquiryStaff(req: CallableRequest<unknown>, campusId?: string): StaffClaims {
  const c = readStaffClaims(req);
  if (c.companyAdmin) return c;
  if (c.centerAdmin && (!campusId || c.campusIds.includes(campusId))) return c;
  throw new HttpsError('permission-denied', '민원을 볼 권한이 없습니다.');
}

/** 방의 처리 중 민원 수를 다시 센다 */
export async function refreshOpenInquiryCount(roomId: string): Promise<void> {
  const snap = await getDb().collection('inquiries').where('chatRoomId', '==', roomId).get();
  const open = snap.docs.filter((d) => d.data().status !== 'resolved').length;
  await getDb().collection('chatRooms').doc(roomId).set({ openInquiryCount: open }, { merge: true });
}

/** 채팅방에 안내(시스템) 메시지 — 보호자들 안 읽음 +1 */
export async function postSystemMessage(roomId: string, text: string, inquiryId?: string): Promise<void> {
  const db = getDb();
  const roomRef = db.collection('chatRooms').doc(roomId);
  const room = await roomRef.get();
  const guardianUids = ((room.data()?.guardianUids as string[] | undefined) ?? []).filter(Boolean);
  const now = Timestamp.now();
  const batch = db.batch();
  batch.set(roomRef.collection('messages').doc(), {
    fromUid: 'system',
    fromRole: 'system',
    text,
    photoIds: [],
    kind: 'system',
    ...(inquiryId ? { inquiryId } : {}),
    createdAt: now,
  });
  const upd: Record<string, unknown> = { lastMessage: { text, fromRole: 'system', at: now }, updatedAt: now };
  for (const uid of guardianUids) upd[`unreadBy.${uid}`] = FieldValue.increment(1);
  batch.update(roomRef, upd);
  await batch.commit();
}

function clean(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}

// ── listInquiries ────────────────────────────────────────

export const listInquiries = onCall(REGION, async (req: CallableRequest<{ programRunId?: string; kind?: string; status?: string }>) => {
  const programRunId = clean(req.data?.programRunId, 200);
  const db = getDb();
  let docs: FirebaseFirestore.QueryDocumentSnapshot[];
  if (programRunId) {
    const run = await loadRun(programRunId);
    assertInquiryStaff(req, run.campusId as string);
    docs = (await db.collection('inquiries').where('programRunId', '==', programRunId).get()).docs;
  } else {
    const c = assertInquiryStaff(req);
    if (c.companyAdmin) docs = (await db.collection('inquiries').orderBy('createdAt', 'desc').limit(500).get()).docs;
    else {
      docs = [];
      for (let i = 0; i < c.campusIds.length; i += 30) {
        docs.push(...(await db.collection('inquiries').where('campusId', 'in', c.campusIds.slice(i, i + 30)).get()).docs);
      }
    }
  }
  const kind = req.data?.kind;
  const status = req.data?.status;
  const filtered = docs.filter((d) => {
    const q = d.data();
    if (kind && q.kind !== kind) return false;
    if (status === 'open' && q.status === 'resolved') return false;
    if (status && status !== 'open' && q.status !== status) return false;
    return true;
  });
  const inquiries = await inquiryDtos(filtered.map((d) => ({ id: d.id, data: d.data() })));
  // 미처리 먼저, 그 안에서 최근순
  inquiries.sort((a, b) => (a.status === 'resolved' ? 1 : 0) - (b.status === 'resolved' ? 1 : 0) || b.createdAt.localeCompare(a.createdAt));
  return { inquiries };
});

// ── getInquiry ───────────────────────────────────────────

export const getInquiry = onCall(REGION, async (req: CallableRequest<{ inquiryId: string }>) => {
  const inquiryId = clean(req.data?.inquiryId, 200);
  if (!inquiryId) throw new HttpsError('invalid-argument', 'inquiryId가 필요합니다.');
  const snap = await getDb().collection('inquiries').doc(inquiryId).get();
  if (!snap.exists) throw new HttpsError('not-found', '민원을 찾을 수 없어요.');
  const data = snap.data()!;
  assertInquiryStaff(req, data.campusId as string);
  const [dto] = await inquiryDtos([{ id: snap.id, data }]);
  const photos = await loadPhotos((data.photoIds as string[] | undefined) ?? []);
  dto.photoUrls = ((data.photoIds as string[] | undefined) ?? []).map((id) => photos.get(id) ?? '').filter(Boolean);
  return { inquiry: dto };
});

// ── fileInquiry ──────────────────────────────────────────

interface FileInquiryRequest {
  programRunId: string;
  kind: InquiryKind;
  category: InquiryCategory;
  channel: InquiryChannel;
  title: string;
  body: string;
  studentId?: string;
  chatRoomId?: string;
  messageId?: string;
}

export const fileInquiry = onCall(REGION, async (req: CallableRequest<FileInquiryRequest>) => {
  const d = req.data ?? ({} as FileInquiryRequest);
  const programRunId = clean(d.programRunId, 200);
  if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
  const run = await loadRun(programRunId);
  const claims = assertInquiryStaff(req, run.campusId as string);
  const kind: InquiryKind = d.kind === 'question' ? 'question' : 'complaint';
  if (!(INQUIRY_CATEGORIES as readonly string[]).includes(d.category)) throw new HttpsError('invalid-argument', '분류를 골라 주세요.');
  const title = clean(d.title, 60);
  const body = clean(d.body, 1000);
  if (!title) throw new HttpsError('invalid-argument', '제목을 입력해 주세요.');
  if (!body) throw new HttpsError('invalid-argument', '내용을 입력해 주세요.');
  const db = getDb();
  const now = Timestamp.now();
  let studentId = clean(d.studentId, 200) || undefined;
  let guardianUid: string | undefined;
  let photoIds: string[] = [];
  let channel: InquiryChannel = d.channel === 'onsite' ? 'onsite' : d.channel === 'chat' ? 'chat' : 'phone';
  const chatRoomId = clean(d.chatRoomId, 400) || undefined;
  const messageId = clean(d.messageId, 200) || undefined;

  let msgRef: FirebaseFirestore.DocumentReference | null = null;
  if (chatRoomId && messageId) {
    const room = await db.collection('chatRooms').doc(chatRoomId).get();
    if (!room.exists || room.data()!.programRunId !== programRunId) throw new HttpsError('not-found', '대화방을 찾을 수 없어요.');
    msgRef = room.ref.collection('messages').doc(messageId);
    const m = await msgRef.get();
    if (!m.exists || m.data()!.fromRole !== 'guardian') throw new HttpsError('failed-precondition', '학부모 메시지만 민원으로 등록할 수 있어요.');
    if (m.data()!.inquiryId) throw new HttpsError('already-exists', '이미 접수된 메시지예요.');
    guardianUid = m.data()!.fromUid as string;
    photoIds = (m.data()!.photoIds as string[] | undefined) ?? [];
    studentId = room.data()!.studentId as string;
    channel = 'chat';
  } else if (channel === 'chat') {
    channel = 'phone';
  }
  if (studentId) {
    const enr = await db.collection('studentProgramEnrollments').where('programRunId', '==', programRunId).where('studentId', '==', studentId).limit(1).get();
    if (enr.empty) throw new HttpsError('not-found', '이 운영 건의 학생이 아니에요.');
  }

  const ref = db.collection('inquiries').doc();
  const data: DocumentData = {
    programRunId,
    campusId: run.campusId,
    ...(studentId ? { studentId } : {}),
    ...(guardianUid ? { guardianUid } : {}),
    kind,
    category: d.category,
    channel,
    title,
    body,
    photoIds,
    status: 'received',
    ...(chatRoomId && messageId ? { chatRoomId, messageId } : {}),
    createdByUid: claims.uid,
    createdAt: now,
    updatedAt: now,
    history: [{ at: now, status: 'received', note: msgRef ? '채팅 메시지를 민원으로 등록' : `${channel === 'phone' ? '전화' : '현장'} 접수`, byUid: claims.uid }],
  };
  await ref.set(data);
  if (msgRef && chatRoomId) {
    await msgRef.update({ kind: 'inquiry', inquiryId: ref.id });
    await postSystemMessage(chatRoomId, '담당 선생님이 불편·요청 사항으로 접수했어요. 처리되면 이 대화방으로 알려 드려요.', ref.id);
    await refreshOpenInquiryCount(chatRoomId);
  }
  const [dto] = await inquiryDtos([{ id: ref.id, data }]);
  return { inquiry: dto };
});

// ── updateInquiry ────────────────────────────────────────

interface UpdateInquiryRequest {
  inquiryId: string;
  status: InquiryStatus;
  resolution?: string;
  note?: string;
  notifyGuardian?: boolean;
}

export const updateInquiry = onCall(REGION, async (req: CallableRequest<UpdateInquiryRequest>) => {
  const inquiryId = clean(req.data?.inquiryId, 200);
  const status = req.data?.status;
  if (!inquiryId) throw new HttpsError('invalid-argument', 'inquiryId가 필요합니다.');
  if (status !== 'received' && status !== 'inProgress' && status !== 'resolved') throw new HttpsError('invalid-argument', '상태가 올바르지 않아요.');
  const ref = getDb().collection('inquiries').doc(inquiryId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', '민원을 찾을 수 없어요.');
  const q = snap.data()!;
  const claims = assertInquiryStaff(req, q.campusId as string);
  const resolution = clean(req.data?.resolution, 1000);
  const note = clean(req.data?.note, 500);
  if (status === 'resolved' && !resolution && !q.resolution) throw new HttpsError('invalid-argument', '처리 내용을 적어 주세요.');
  const now = Timestamp.now();
  const changed = q.status !== status;
  const upd: Record<string, unknown> = { status, updatedAt: now };
  if (resolution) upd.resolution = resolution;
  if (status === 'resolved') {
    upd.resolvedAt = now;
    upd.resolvedByUid = claims.uid;
  } else {
    upd.resolvedAt = FieldValue.delete();
    upd.resolvedByUid = FieldValue.delete();
  }
  if (changed || note || resolution) {
    upd.history = FieldValue.arrayUnion({ at: now, status, ...(note || status === 'resolved' ? { note: note || '처리 완료' } : {}), byUid: claims.uid });
  }
  await ref.update(upd);
  const roomId = q.chatRoomId as string | undefined;
  if (roomId) {
    if (req.data?.notifyGuardian && status === 'resolved') {
      await postSystemMessage(roomId, `처리 완료: ${resolution || (q.resolution as string) || ''}`, inquiryId);
    }
    await refreshOpenInquiryCount(roomId);
  }
  return { ok: true };
});

/** 발주처 현황 · 보고서 — 민원(접수 · 처리 중 · 처리 완료) · 문의(채팅 질문 + 기록된 문의) */
export async function inquiryStatsFor(programRunId: string): Promise<{
  complaints: { received: number; inProgress: number; resolved: number };
  questions: { received: number; answered: number; avgFirstReplyMinutes: number | null };
}> {
  const db = getDb();
  const [qs, rooms] = await Promise.all([
    db.collection('inquiries').where('programRunId', '==', programRunId).get(),
    db.collection('chatRooms').where('programRunId', '==', programRunId).get(),
  ]);
  const all = qs.docs.map((d) => d.data());
  const complaints = all.filter((q) => q.kind !== 'question');
  const logged = all.filter((q) => q.kind === 'question');
  let turns = 0;
  let answered = 0;
  let minutes = 0;
  for (const r of rooms.docs) {
    const s = (r.data().stats as { questionTurns?: number; answeredTurns?: number; replyMinutesSum?: number } | undefined) ?? {};
    turns += s.questionTurns ?? 0;
    answered += s.answeredTurns ?? 0;
    minutes += s.replyMinutesSum ?? 0;
  }
  return {
    complaints: {
      received: complaints.length,
      inProgress: complaints.filter((q) => q.status !== 'resolved').length,
      resolved: complaints.filter((q) => q.status === 'resolved').length,
    },
    questions: {
      received: turns + logged.length,
      answered: answered + logged.filter((q) => q.status === 'resolved').length,
      avgFirstReplyMinutes: answered > 0 ? Math.round(minutes / answered) : null,
    },
  };
}
