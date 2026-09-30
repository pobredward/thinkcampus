/**
 * 학부모 채팅 — 자녀 × 운영 건마다 방 하나 (학부모 ↔ 캠퍼스 담당 선생님)
 *
 *   chatRooms/{programRunId}__{studentId}
 *     programRunId, campusId, studentId, guardianUids[]
 *     lastMessage { text, fromRole, at } · updatedAt
 *     unreadBy { [guardianUid]: n }   학부모별 안 읽은 수 (앱 탭 배지 — 클라이언트가 직접 읽는다)
 *     staffUnread                      센터가 안 읽은 학부모 메시지 수
 *     waitingSince                     학부모 메시지에 아직 답이 없으면 그 시각 (짧은 인사 · 빠른 질문은 빼고)
 *     lastReadAt { [uid] | staff }     읽음 표시
 *     openInquiryCount                 처리 중 민원 수
 *     stats { questionTurns, answeredTurns, replyMinutesSum, openQuestionAt }  발주처 "문의 · 첫 답변 시간" 집계
 *   chatRooms/{id}/messages/{mid}  fromUid, fromRole, text, photoIds[], kind, inquiryId?, createdAt
 *   chatPhotos/{id}                roomId, dataUrl (브라우저에서 줄인 JPEG), bytes, createdAt
 *
 * Callable: listGuardianChatRooms · listCenterChatRooms · getChatRoom · sendChatMessage · markChatRead
 * 보안 규칙: chatRooms 문서는 학부모(guardianUids) · 캠퍼스 직원이 읽기만 (실시간 배지 · 새로 고침 신호), 쓰기는 모두 Functions.
 * 규칙은 web/src/services/demo/chat.ts 와 같다.
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { readStaffClaims } from './auth/staffClaims';
import { getDb, todayKstDate, UNASSIGNED_SECTION_ID } from './lib/centerRunHelpers';
import {
  DEFAULT_CHAT_HOURS,
  INQUIRY_CATEGORIES,
  MAX_PHOTO_DATA_URL,
  REGION,
  chatRoomId,
  enrollmentOf,
  guardianLabelFor,
  guardianNames,
  isAcknowledgement,
  isQuestionText,
  parseRoomId,
  roomStatusOf,
  tsIso,
  type InquiryCategory,
} from './lib/chatShared';
import { inquiryDtos, loadPhotos, refreshOpenInquiryCount } from './inquiries';
import { loadRun, loadStaff, normalizeSections, runTitle, type DocumentData } from './lib/runContext';

const STAFF_KEY = 'staff';
type Viewer = { kind: 'guardian'; uid: string } | { kind: 'staff'; uid: string };
type QuickTopic = 'materials' | 'absence' | 'place' | 'etc';

interface RoomContext {
  roomId: string;
  programRunId: string;
  studentId: string;
  run: DocumentData;
  student: DocumentData;
  sectionId: string;
  viewer: Viewer;
  status: 'open' | 'readonly' | 'hidden';
}

/** 방에 들어갈 수 있는지 — 보호자(학생의 guardianUids) 또는 그 캠퍼스 센터 · 통합 관리자 */
async function roomContext(req: CallableRequest<unknown>, roomId: string): Promise<RoomContext> {
  if (!req.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const { programRunId, studentId } = parseRoomId(roomId);
  const [run, studentSnap, enr] = await Promise.all([
    loadRun(programRunId),
    getDb().collection('students').doc(studentId).get(),
    enrollmentOf(programRunId, studentId),
  ]);
  if (!studentSnap.exists || !enr) throw new HttpsError('not-found', '대화방을 찾을 수 없어요.');
  const student = studentSnap.data()!;
  const uid = req.auth.uid;
  let viewer: Viewer;
  if (((student.guardianUids as string[] | undefined) ?? []).includes(uid)) viewer = { kind: 'guardian', uid };
  else {
    const c = readStaffClaims(req);
    if (!(c.companyAdmin || (c.centerAdmin && c.campusIds.includes(run.campusId as string)))) {
      throw new HttpsError('permission-denied', '이 대화방에 대한 권한이 없습니다.');
    }
    viewer = { kind: 'staff', uid };
  }
  const status = roomStatusOf(run);
  if (viewer.kind === 'guardian' && status === 'hidden') throw new HttpsError('failed-precondition', '종료된 프로그램의 대화방이에요.');
  return { roomId: chatRoomId(programRunId, studentId), programRunId, studentId, run, student, sectionId: enr.sectionId || UNASSIGNED_SECTION_ID, viewer, status };
}

function sectionLabelOf(run: DocumentData, sectionId: string): string {
  if (!sectionId || sectionId === UNASSIGNED_SECTION_ID) return '';
  return normalizeSections(run).find((s) => s.id === sectionId)?.label ?? sectionId;
}

async function campusOf(campusId: string): Promise<DocumentData> {
  const snap = await getDb().collection('campuses').doc(campusId).get();
  return snap.data() ?? {};
}

function roomDto(
  roomId: string,
  room: DocumentData | undefined,
  base: { programRunId: string; run: DocumentData; campusName: string; studentId: string; studentName: string; sectionLabel: string; guardianLabel: string },
  viewer: Viewer,
) {
  const status = roomStatusOf(base.run);
  const last = room?.lastMessage as { text?: string; fromRole?: string; at?: unknown } | undefined;
  return {
    id: roomId,
    programRunId: base.programRunId,
    programTitle: runTitle(base.run),
    campusId: base.run.campusId as string,
    campusName: base.campusName,
    studentId: base.studentId,
    studentName: base.studentName,
    sectionLabel: base.sectionLabel,
    guardianLabel: base.guardianLabel,
    staffLabel: `${base.campusName} 담당 선생님`,
    status: status === 'open' ? ('open' as const) : ('readonly' as const),
    lastMessage: last?.at ? { text: last.text ?? '', fromRole: (last.fromRole ?? 'staff') as 'guardian' | 'staff' | 'system', at: tsIso(last.at) } : null,
    unread: viewer.kind === 'guardian' ? Number((room?.unreadBy as Record<string, number> | undefined)?.[viewer.uid] ?? 0) : Number(room?.staffUnread ?? 0),
    waiting: !!room?.waitingSince,
    waitingSince: room?.waitingSince ? tsIso(room.waitingSince) : null,
    openInquiryCount: Number(room?.openInquiryCount ?? 0),
  };
}

// ── 학부모 방 목록 ──────────────────────────────────────────

export const listGuardianChatRooms = onCall(REGION, async (req: CallableRequest<Record<string, never>>) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
  const db = getDb();
  const studentsSnap = await db.collection('students').where('guardianUids', 'array-contains', uid).get();
  const students = new Map(studentsSnap.docs.map((d) => [d.id, d.data()]));
  const ids = [...students.keys()];
  const enrollments: DocumentData[] = [];
  for (let i = 0; i < ids.length; i += 30) {
    enrollments.push(...(await db.collection('studentProgramEnrollments').where('studentId', 'in', ids.slice(i, i + 30)).get()).docs.map((d) => d.data()));
  }
  const runIds = [...new Set(enrollments.map((e) => e.programRunId as string))];
  const runs = new Map<string, DocumentData>();
  await Promise.all(runIds.map(async (id) => runs.set(id, await loadRun(id).catch(() => ({})))));
  const campusIds = [...new Set([...runs.values()].map((r) => r.campusId as string).filter(Boolean))];
  const campuses = new Map<string, DocumentData>();
  await Promise.all(campusIds.map(async (id) => campuses.set(id, await campusOf(id))));

  const rooms = [];
  for (const e of enrollments) {
    if (e.status === 'withdrawn') continue;
    const run = runs.get(e.programRunId as string);
    if (!run || !run.campusId || roomStatusOf(run) === 'hidden') continue;
    const id = chatRoomId(e.programRunId as string, e.studentId as string);
    const snap = await db.collection('chatRooms').doc(id).get();
    const st = students.get(e.studentId as string);
    rooms.push(
      roomDto(
        id,
        snap.data(),
        {
          programRunId: e.programRunId as string,
          run,
          campusName: (campuses.get(run.campusId as string)?.name as string) ?? (run.campusId as string),
          studentId: e.studentId as string,
          studentName: (st?.name as string) ?? '',
          sectionLabel: sectionLabelOf(run, (e.sectionId as string) || ''),
          guardianLabel: '',
        },
        { kind: 'guardian', uid },
      ),
    );
  }
  rooms.sort(
    (a, b) =>
      (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) ||
      (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1) ||
      (b.lastMessage?.at ?? '').localeCompare(a.lastMessage?.at ?? '') ||
      a.studentName.localeCompare(b.studentName, 'ko'),
  );
  return { rooms };
});

// ── 센터 방 목록 ────────────────────────────────────────────

export const listCenterChatRooms = onCall(REGION, async (req: CallableRequest<{ programRunId: string }>) => {
  const programRunId = req.data?.programRunId?.trim();
  if (!programRunId) throw new HttpsError('invalid-argument', 'programRunId가 필요합니다.');
  const run = await loadRun(programRunId);
  const c = readStaffClaims(req);
  if (!(c.companyAdmin || (c.centerAdmin && c.campusIds.includes(run.campusId as string)))) throw new HttpsError('permission-denied', '이 캠퍼스에 대한 권한이 없습니다.');
  const db = getDb();
  const [snap, enrSnap, campus] = await Promise.all([
    db.collection('chatRooms').where('programRunId', '==', programRunId).get(),
    db.collection('studentProgramEnrollments').where('programRunId', '==', programRunId).get(),
    campusOf(run.campusId as string),
  ]);
  const withMessages = snap.docs.filter((d) => d.data().lastMessage);
  const sectionByStudent = new Map(enrSnap.docs.map((d) => [d.data().studentId as string, (d.data().sectionId as string) || '']));
  const studentIds = withMessages.map((d) => d.data().studentId as string);
  const studentSnaps = studentIds.length ? await db.getAll(...studentIds.map((id) => db.collection('students').doc(id))) : [];
  const names = new Map(studentSnaps.map((s) => [s.id, (s.data()?.name as string) ?? '']));
  const guardianUids = withMessages.flatMap((d) => (d.data().guardianUids as string[] | undefined) ?? []);
  const gNames = await guardianNames(guardianUids);
  const rooms = await Promise.all(
    withMessages.map(async (d) => {
      const r = d.data();
      const sid = r.studentId as string;
      return roomDto(
        d.id,
        r,
        {
          programRunId,
          run,
          campusName: (campus.name as string) ?? (run.campusId as string),
          studentId: sid,
          studentName: names.get(sid) ?? '',
          sectionLabel: sectionLabelOf(run, sectionByStudent.get(sid) ?? ''),
          guardianLabel: await guardianLabelFor(sid, gNames),
        },
        { kind: 'staff', uid: c.uid },
      );
    }),
  );
  rooms.sort(
    (a, b) =>
      (b.waiting ? 1 : 0) - (a.waiting ? 1 : 0) ||
      (a.waitingSince ?? '').localeCompare(b.waitingSince ?? '') ||
      (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) ||
      (b.lastMessage?.at ?? '').localeCompare(a.lastMessage?.at ?? ''),
  );
  return { rooms };
});

// ── 방 열기 ───────────────────────────────────────────────

export const getChatRoom = onCall(REGION, async (req: CallableRequest<{ roomId: string }>) => {
  const ctx = await roomContext(req, req.data?.roomId);
  const db = getDb();
  const roomRef = db.collection('chatRooms').doc(ctx.roomId);
  const [roomSnap, msgSnap, inqSnap, campus] = await Promise.all([
    roomRef.get(),
    roomRef.collection('messages').orderBy('createdAt', 'asc').limitToLast(300).get(),
    db.collection('inquiries').where('chatRoomId', '==', ctx.roomId).get(),
    campusOf(ctx.run.campusId as string),
  ]);
  const room = roomSnap.data();
  const msgs = msgSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<DocumentData & { id: string }>;
  const staff = await loadStaff(msgs.filter((m) => m.fromRole === 'staff').map((m) => m.fromUid as string));
  const gNames = await guardianNames([...msgs.filter((m) => m.fromRole === 'guardian').map((m) => m.fromUid as string), ...((ctx.student.guardianUids as string[] | undefined) ?? [])]);
  const photos = await loadPhotos(msgs.flatMap((m) => (m.photoIds as string[] | undefined) ?? []));
  const campusName = (campus.name as string) ?? (ctx.run.campusId as string);
  const lastRead = (room?.lastReadAt as Record<string, unknown> | undefined) ?? {};
  const otherReadAt =
    ctx.viewer.kind === 'guardian'
      ? tsIso(lastRead[STAFF_KEY])
      : Object.entries(lastRead)
          .filter(([k]) => k !== STAFF_KEY)
          .map(([, v]) => tsIso(v))
          .sort()
          .pop() ?? '';
  const guardianLinksSnap = await db.collection('guardianLinks').where('studentId', '==', ctx.studentId).get();
  const relationOf = new Map(guardianLinksSnap.docs.map((d) => [d.data().guardianUid as string, (d.data().guardianRelation as string) ?? '']));
  const nameOf = (m: DocumentData): string => {
    if (m.fromRole === 'system') return '안내';
    if (m.fromRole === 'staff') {
      const p = staff.get(m.fromUid as string);
      return p && p.displayName !== m.fromUid ? `${p.displayName} (${campusName})` : `${campusName} 담당 선생님`;
    }
    const n = gNames.get(m.fromUid as string);
    return n ? `${n} 학부모` : relationOf.get(m.fromUid as string) || '보호자';
  };
  const messages = msgs.map((m) => {
    const createdAt = tsIso(m.createdAt);
    const mine = ctx.viewer.kind === 'guardian' ? m.fromRole === 'guardian' && m.fromUid === ctx.viewer.uid : m.fromRole === 'staff';
    return {
      id: m.id,
      fromRole: m.fromRole as 'guardian' | 'staff' | 'system',
      fromName: nameOf(m),
      text: (m.text as string) ?? '',
      photoUrls: ((m.photoIds as string[] | undefined) ?? []).map((id) => photos.get(id) ?? '').filter(Boolean),
      kind: (m.kind as string) ?? 'text',
      inquiryId: (m.inquiryId as string | undefined) || undefined,
      createdAt,
      mine,
      readByOther: mine && !!otherReadAt && otherReadAt >= createdAt,
    };
  });
  const inquiries = await inquiryDtos(inqSnap.docs.map((d) => ({ id: d.id, data: d.data() })));
  inquiries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    room: roomDto(
      ctx.roomId,
      room,
      {
        programRunId: ctx.programRunId,
        run: ctx.run,
        campusName,
        studentId: ctx.studentId,
        studentName: (ctx.student.name as string) ?? '',
        sectionLabel: sectionLabelOf(ctx.run, ctx.sectionId),
        guardianLabel: ctx.viewer.kind === 'staff' ? await guardianLabelFor(ctx.studentId, gNames) : '',
      },
      ctx.viewer,
    ),
    messages,
    inquiries,
    hours: (campus.chatHours as string) || DEFAULT_CHAT_HOURS,
  };
});

// ── 보내기 ────────────────────────────────────────────────

interface SendChatMessageRequest {
  roomId: string;
  text: string;
  photoDataUrls?: string[];
  quick?: QuickTopic;
  asInquiry?: { category: InquiryCategory };
}

function fmtDot(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
  return `${key.replace(/-/g, '.')} (${wd})`;
}

/** 빠른 질문(준비물 · 장소)에 수업 정보로 바로 답 */
async function quickAnswer(ctx: RoomContext, topic: QuickTopic): Promise<string | null> {
  const db = getDb();
  const ov = (ctx.run.overrides as Record<string, unknown> | undefined) ?? {};
  if (topic === 'materials') {
    const today = todayKstDate();
    const snap = await db.collection('runSessions').where('programRunId', '==', ctx.programRunId).get();
    const next = snap.docs
      .map((d) => d.data())
      .filter((s) => s.status !== 'cancelled' && (s.scheduledDate as string) >= today)
      .filter((s) => {
        const sec = (s.sectionId as string) || UNASSIGNED_SECTION_ID;
        return sec === UNASSIGNED_SECTION_ID || ctx.sectionId === UNASSIGNED_SECTION_ID || sec === ctx.sectionId;
      })
      .sort((a, b) => (a.scheduledDate as string).localeCompare(b.scheduledDate as string) || ((a.startTime as string) ?? '').localeCompare((b.startTime as string) ?? ''))[0];
    if (!next) return '남은 수업이 없어요. 궁금한 점은 이어서 남겨 주세요.';
    const tpl = next.sessionTemplateId ? (await db.collection('sessionTemplates').doc(next.sessionTemplateId as string).get()).data() : undefined;
    const materials = [...new Set([...((ov.commonMaterials as string[] | undefined) ?? []), ...((tpl?.materials as string[] | undefined) ?? [])])];
    const topicText = ((next.overrides as { topic?: string } | undefined)?.topic ?? (next.topic as string) ?? '').trim();
    const start = (next.startTime as string) || (ctx.run.startTime as string) || '';
    const end = (next.endTime as string) || (ctx.run.endTime as string) || '';
    return `다음 수업 안내 — ${fmtDot(next.scheduledDate as string)} ${next.sessionNumber}회차 ‘${topicText}’ ${start}–${end}\n준비물: ${materials.length ? materials.join(', ') : '따로 없어요'}\n장소: ${(next.location as string) || (ctx.run.location as string) || ''}`;
  }
  if (topic === 'place') {
    const directions = (ov.directions as Array<{ label: string; text: string }> | undefined) ?? [];
    const parking = directions.find((d) => d.label === '주차')?.text;
    const arrive = directions.find((d) => d.label === '도착하면')?.text;
    return [`장소: ${(ctx.run.location as string) ?? ''}`, parking ? `주차: ${parking}` : null, arrive ? `도착하면: ${arrive}` : null].filter(Boolean).join('\n');
  }
  return null;
}

function titleFrom(text: string, category: InquiryCategory): string {
  const first = text.replace(/\s+/g, ' ').trim();
  if (!first) return `${category === 'etc' ? '기타' : '불편·요청'} 관련 요청`;
  return first.length > 24 ? `${first.slice(0, 24)}…` : first;
}

export const sendChatMessage = onCall(REGION, async (req: CallableRequest<SendChatMessageRequest>) => {
  const ctx = await roomContext(req, req.data?.roomId);
  if (ctx.status !== 'open') throw new HttpsError('failed-precondition', '종료된 프로그램이라 메시지를 보낼 수 없어요.');
  const text = typeof req.data?.text === 'string' ? req.data.text.trim() : '';
  const rawPhotos = Array.isArray(req.data?.photoDataUrls) ? req.data.photoDataUrls.slice(0, 3) : [];
  for (const p of rawPhotos) {
    if (typeof p !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(p)) throw new HttpsError('invalid-argument', '사진 형식이 올바르지 않아요.');
    if (p.length > MAX_PHOTO_DATA_URL) throw new HttpsError('invalid-argument', '사진이 너무 커요. 다른 사진을 골라 주세요.');
  }
  if (!text && rawPhotos.length === 0) throw new HttpsError('invalid-argument', '내용을 입력해 주세요.');
  if (text.length > 1000) throw new HttpsError('invalid-argument', '1,000자까지 보낼 수 있어요.');
  const isGuardian = ctx.viewer.kind === 'guardian';
  const quick = isGuardian ? req.data?.quick : undefined;
  const asInquiry = isGuardian && req.data?.asInquiry && (INQUIRY_CATEGORIES as readonly string[]).includes(req.data.asInquiry.category) ? req.data.asInquiry : undefined;

  const db = getDb();
  const roomRef = db.collection('chatRooms').doc(ctx.roomId);
  const now = Timestamp.now();
  const guardianUids = ((ctx.student.guardianUids as string[] | undefined) ?? []).filter(Boolean);

  // 사진 — chatPhotos 에 따로 둔다 (메시지 문서가 1MB 를 넘지 않게)
  const photoIds: string[] = [];
  for (const p of rawPhotos) {
    const ref = db.collection('chatPhotos').doc();
    await ref.set({ roomId: ctx.roomId, programRunId: ctx.programRunId, dataUrl: p, bytes: p.length, createdByUid: ctx.viewer.uid, createdAt: now });
    photoIds.push(ref.id);
  }

  const kind = asInquiry ? 'inquiry' : quick && quick !== 'etc' && quick !== 'absence' ? 'quick' : 'text';
  const msgRef = roomRef.collection('messages').doc();
  let inquiryId: string | undefined;
  if (asInquiry) {
    const inqRef = db.collection('inquiries').doc();
    inquiryId = inqRef.id;
    await inqRef.set({
      programRunId: ctx.programRunId,
      campusId: ctx.run.campusId,
      studentId: ctx.studentId,
      guardianUid: ctx.viewer.uid,
      kind: 'complaint',
      category: asInquiry.category,
      channel: 'chat',
      title: titleFrom(text, asInquiry.category),
      body: text,
      photoIds,
      status: 'received',
      chatRoomId: ctx.roomId,
      messageId: msgRef.id,
      createdByUid: ctx.viewer.uid,
      createdAt: now,
      updatedAt: now,
      history: [{ at: now, status: 'received', byUid: ctx.viewer.uid }],
    });
  }

  const answer = isGuardian && !asInquiry && (quick === 'materials' || quick === 'place') ? await quickAnswer(ctx, quick) : null;

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef);
    const room = snap.data() ?? {};
    const stats = { questionTurns: 0, answeredTurns: 0, replyMinutesSum: 0, openQuestionAt: null as Timestamp | null, lastNonSystem: null as string | null, ...((room.stats as object | undefined) ?? {}) };
    const upd: Record<string, unknown> = {
      programRunId: ctx.programRunId,
      campusId: ctx.run.campusId,
      studentId: ctx.studentId,
      guardianUids,
      updatedAt: now,
      lastMessage: { text: text || '사진', fromRole: isGuardian ? 'guardian' : 'staff', at: now },
    };
    if (!snap.exists) {
      upd.createdAt = now;
      upd.unreadBy = {};
      upd.staffUnread = 0;
      upd.openInquiryCount = 0;
      upd.lastReadAt = {};
      upd.waitingSince = null;
    }
    tx.set(msgRef, {
      fromUid: ctx.viewer.uid,
      fromRole: isGuardian ? 'guardian' : 'staff',
      text,
      photoIds,
      kind,
      ...(inquiryId ? { inquiryId } : {}),
      createdAt: now,
    });

    if (isGuardian) {
      upd.staffUnread = FieldValue.increment(1);
      upd[`lastReadAt.${ctx.viewer.uid}`] = now;
      for (const g of guardianUids) if (g !== ctx.viewer.uid) upd[`unreadBy.${g}`] = FieldValue.increment(1);
      const ack = kind === 'text' && photoIds.length === 0 && isAcknowledgement(text);
      if (kind !== 'quick' && !ack && !room.waitingSince) upd.waitingSince = now;
      // 문의 집계 — 물음(? · 빠른 질문) 한 번 = 1건, 직원 답 · 자동 안내까지 걸린 시간
      const isQuestion = kind === 'quick' || (kind === 'text' && isQuestionText(text));
      if (isQuestion && (stats.lastNonSystem !== 'guardian' || !stats.openQuestionAt)) {
        stats.questionTurns += 1;
        stats.openQuestionAt = now;
      }
      stats.lastNonSystem = 'guardian';
    } else {
      upd.staffUnread = 0;
      upd.waitingSince = null;
      upd[`lastReadAt.${STAFF_KEY}`] = now;
      for (const g of guardianUids) upd[`unreadBy.${g}`] = FieldValue.increment(1);
      if (stats.openQuestionAt) {
        stats.answeredTurns += 1;
        stats.replyMinutesSum += Math.round((now.toMillis() - stats.openQuestionAt.toMillis()) / 60_000);
        stats.openQuestionAt = null;
      }
      stats.lastNonSystem = 'staff';
    }

    // 자동 안내 (민원 접수 확인 · 빠른 질문 답)
    const sysText = asInquiry ? '불편·요청 사항으로 접수됐어요. 처리되면 이 대화방으로 알려 드려요.' : answer;
    if (sysText) {
      const at = Timestamp.fromMillis(now.toMillis() + 1);
      tx.set(roomRef.collection('messages').doc(), { fromUid: 'system', fromRole: 'system', text: sysText, photoIds: [], kind: 'system', ...(inquiryId ? { inquiryId } : {}), createdAt: at });
      upd.lastMessage = { text: sysText, fromRole: 'system', at };
      if (isGuardian) upd[`lastReadAt.${ctx.viewer.uid}`] = at;
      if (!asInquiry && stats.openQuestionAt) {
        stats.answeredTurns += 1;
        stats.openQuestionAt = null;
      }
    }
    upd.stats = stats;
    if (snap.exists) tx.update(roomRef, upd);
    else {
      // 새 방 — 점 표기 필드는 set 에서 중첩으로 풀어 쓴다
      const created: Record<string, unknown> = {};
      const unreadBy: Record<string, unknown> = {};
      const lastReadAt: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(upd)) {
        if (k.startsWith('unreadBy.')) unreadBy[k.slice(9)] = 1;
        else if (k.startsWith('lastReadAt.')) lastReadAt[k.slice(11)] = v;
        else if (k === 'staffUnread') created.staffUnread = isGuardian ? 1 : 0;
        else created[k] = v;
      }
      created.unreadBy = unreadBy;
      created.lastReadAt = lastReadAt;
      tx.set(roomRef, created);
    }
  });

  if (inquiryId) await refreshOpenInquiryCount(ctx.roomId);
  return { ok: true, messageId: msgRef.id };
});

// ── 읽음 ─────────────────────────────────────────────────

export const markChatRead = onCall(REGION, async (req: CallableRequest<{ roomId: string }>) => {
  const ctx = await roomContext(req, req.data?.roomId);
  const ref = getDb().collection('chatRooms').doc(ctx.roomId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: true };
  const now = Timestamp.now();
  if (ctx.viewer.kind === 'guardian') await ref.update({ [`unreadBy.${ctx.viewer.uid}`]: 0, [`lastReadAt.${ctx.viewer.uid}`]: now });
  else await ref.update({ staffUnread: 0, [`lastReadAt.${STAFF_KEY}`]: now });
  return { ok: true };
});

/** 센터 홈 요약 — 답을 기다리는 방 · 가장 오래 기다린 시각 · 미처리 민원 */
export async function chatKpiFor(programRunId: string): Promise<{ chatWaiting: number; chatOldestWaitingAt: string | null; complaintsOpen: number }> {
  const db = getDb();
  const [rooms, inq] = await Promise.all([
    db.collection('chatRooms').where('programRunId', '==', programRunId).get(),
    db.collection('inquiries').where('programRunId', '==', programRunId).get(),
  ]);
  const waits = rooms.docs
    .map((d) => d.data().waitingSince)
    .filter(Boolean)
    .map((t) => tsIso(t))
    .sort();
  return {
    chatWaiting: waits.length,
    chatOldestWaitingAt: waits[0] ?? null,
    complaintsOpen: inq.docs.filter((d) => d.data().kind !== 'question' && d.data().status !== 'resolved').length,
  };
}
