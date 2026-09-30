/**
 * 체험 세계 — 학부모 채팅 · 민원 공통 로직 (학부모 · 프로그램 매니저 · 통합 관리자 · 발주처가 같이 쓴다)
 * 실서비스 Functions(functions/src/chat.ts)와 같은 규칙:
 *   - 방은 자녀 × 운영 건 하나. 첫 메시지를 보낼 때 만들어진다 (그 전에는 목록에만 보이는 "빈 방")
 *   - 읽음: 학부모는 자기 uid, 캠퍼스 직원은 "staff" 한 칸을 같이 쓴다
 *   - 답을 기다림: 학부모의 질문(글 · 민원 접수) 뒤에 직원 답이 아직 없음. 빠른 질문(준비물 · 장소)은 시스템이 바로 답한다
 *   - 문의 집계: 학부모가 먼저 보낸 물음(‘?’ 가 있거나 빠른 질문)을 한 건으로, 직원·시스템이 답하면 답변 완료
 */

import { todayKey } from "@/lib/dates";
import type {
  ChatMessageDto,
  ChatRoomDetail,
  ChatRoomDto,
  FileInquiryInput,
  InquiryCategory,
  InquiryDto,
  PartnerInquiryStats,
  QuickTopic,
  SendChatMessageInput,
  UpdateInquiryInput,
} from "@/services/types";
import { INQUIRY_CATEGORY_LABEL } from "@/services/types";
import { buildProgramForSection, campusName, runById, sectionLabel, staffById } from "./select";
import {
  chatRoomId,
  DEFAULT_CHAT_HOURS,
  type DemoChatMessage,
  type DemoChatRoom,
  type DemoInquiry,
  type DemoWorld,
  nowIso,
} from "./world";

export type ChatViewer = { kind: "guardian"; uid: string } | { kind: "staff"; uid: string; campusIds: string[] | null };

const READ_KEY_STAFF = "staff";
const RELATION_LABEL: Record<string, string> = { 모: "어머니", 부: "아버지", 조모: "할머니", 조부: "할아버지" };

export function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}○`;
  return `${name[0]}${"○".repeat(name.length - 2)}${name[name.length - 1]}`;
}

function readKey(v: ChatViewer): string {
  return v.kind === "guardian" ? v.uid : READ_KEY_STAFF;
}

/** 방 id → (운영 건, 학생) */
export function parseRoomId(roomId: string): { programRunId: string; studentId: string } | null {
  const i = roomId.indexOf("__");
  if (i <= 0 || i >= roomId.length - 2) return null;
  return { programRunId: roomId.slice(0, i), studentId: roomId.slice(i + 2) };
}

function enrollmentOf(w: DemoWorld, programRunId: string, studentId: string) {
  return w.enrollments.find((e) => e.programRunId === programRunId && e.studentId === studentId && e.status !== "withdrawn");
}

/** 방 상태 — 끝난 운영 건은 30일까지 읽기 전용, 그 뒤엔 목록에서 빠진다 */
export function roomStatus(w: DemoWorld, programRunId: string): "open" | "readonly" | "hidden" {
  const run = runById(w, programRunId);
  if (run.status !== "completed") return "open";
  const end = new Date(`${run.endDate}T23:59:59+09:00`).getTime();
  return Date.now() - end <= 30 * 86_400_000 ? "readonly" : "hidden";
}

function assertAccess(w: DemoWorld, v: ChatViewer, programRunId: string, studentId: string) {
  const run = runById(w, programRunId);
  if (v.kind === "guardian") {
    const s = w.students.find((x) => x.id === studentId);
    if (!s || !s.guardianUids.includes(v.uid)) throw new Error("이 대화방을 볼 수 없어요.");
  } else if (v.campusIds && !v.campusIds.includes(run.campusId)) {
    throw new Error("이 캠퍼스의 대화방이 아니에요.");
  }
  if (!enrollmentOf(w, programRunId, studentId)) throw new Error("수강 정보가 없어요.");
  return run;
}

function roomMessages(w: DemoWorld, roomId: string): DemoChatMessage[] {
  return w.chatMessages.filter((m) => m.roomId === roomId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * "네 알겠습니다!" · "감사합니다" 같은 짧은 인사는 답을 기다리는 메시지로 치지 않는다
 * (functions/src/chat.ts 의 isAcknowledgement 와 같은 규칙)
 */
const ACK = /(감사|고맙|알겠|확인했|확인할게|좋아요|수고|넵|^네[\s.!~]*$|^예[\s.!~]*$)/;
export function isAcknowledgement(text: string): boolean {
  const t = text.trim();
  if (!t || /[?？]/.test(t) || t.length > 40) return false;
  return ACK.test(t);
}

/** 학부모 메시지 뒤 직원 답이 아직 없으면 그 메시지 시각 (빠른 질문 자동 답 · 짧은 인사는 빼고) */
export function waitingSince(messages: DemoChatMessage[]): string | null {
  let pending: string | null = null;
  for (const m of messages) {
    if (m.fromRole === "guardian") {
      if (m.kind === "quick") continue; // 시스템이 바로 답한다
      if (m.kind === "text" && m.photoUrls.length === 0 && isAcknowledgement(m.text)) continue;
      if (!pending) pending = m.createdAt;
    } else if (m.fromRole === "staff") {
      pending = null;
    }
  }
  return pending;
}

/** 문의 집계 — 학부모가 먼저 보낸 물음 한 번 = 1건 */
export function questionTurns(messages: DemoChatMessage[]): Array<{ at: string; answeredAt: string | null }> {
  const turns: Array<{ at: string; answeredAt: string | null }> = [];
  let open: { at: string; answeredAt: string | null } | null = null;
  let lastNonSystem: DemoChatMessage["fromRole"] | null = null;
  for (const m of messages) {
    if (m.fromRole === "guardian") {
      const isQuestion = m.kind === "quick" || (m.kind === "text" && /[?？]/.test(m.text));
      if (isQuestion && (lastNonSystem !== "guardian" || !open)) {
        open = { at: m.createdAt, answeredAt: null };
        turns.push(open);
      }
      lastNonSystem = "guardian";
    } else if (m.fromRole === "staff") {
      if (open && !open.answeredAt) open.answeredAt = m.createdAt;
      open = null;
      lastNonSystem = "staff";
    } else if (m.fromRole === "system" && open && !open.answeredAt && !m.inquiryId) {
      // 빠른 질문에 대한 자동 안내
      open.answeredAt = m.createdAt;
      open = null;
    }
  }
  return turns;
}

function guardianLabel(w: DemoWorld, studentId: string): string {
  const links = w.guardianLinks.filter((l) => l.studentId === studentId && l.status === "active");
  if (links.length === 0) return "연결된 보호자 없음";
  const first = links[0];
  const g = w.guardians.find((x) => x.uid === first.guardianUid);
  const rel = RELATION_LABEL[first.guardianRelation] ?? first.guardianRelation;
  const name = g?.displayName ? `${g.displayName} (${first.guardianRelation})` : rel;
  return links.length > 1 ? `${name} 외 ${links.length - 1}명` : name;
}

function nameOf(w: DemoWorld, m: DemoChatMessage, run: { campusId: string }): string {
  if (m.fromRole === "system") return "씽크캠퍼스 안내";
  if (m.fromRole === "staff") {
    const st = staffById(w, m.fromUid);
    return st ? `${st.displayName} (${campusName(w, run.campusId)})` : `${campusName(w, run.campusId)} 담당`;
  }
  const link = w.guardianLinks.find((l) => l.guardianUid === m.fromUid);
  const g = w.guardians.find((x) => x.uid === m.fromUid);
  if (g?.displayName) return `${g.displayName} 학부모`;
  return link ? `${RELATION_LABEL[link.guardianRelation] ?? "보호자"}` : "보호자";
}

export function buildRoomDto(w: DemoWorld, v: ChatViewer, programRunId: string, studentId: string): ChatRoomDto {
  const run = runById(w, programRunId);
  const id = chatRoomId(programRunId, studentId);
  const room = w.chatRooms.find((r) => r.id === id);
  const msgs = roomMessages(w, id);
  const last = msgs[msgs.length - 1];
  const key = readKey(v);
  const readAt = room?.lastReadAt[key] ?? "";
  const unread = msgs.filter((m) => (v.kind === "guardian" ? m.fromRole !== "guardian" : m.fromRole === "guardian") && m.createdAt > readAt).length;
  const enr = enrollmentOf(w, programRunId, studentId);
  const student = w.students.find((s) => s.id === studentId);
  const status = roomStatus(w, programRunId);
  const since = waitingSince(msgs);
  return {
    id,
    programRunId,
    programTitle: run.title,
    campusId: run.campusId,
    campusName: campusName(w, run.campusId),
    studentId,
    studentName: student?.name ?? studentId,
    sectionLabel: enr ? sectionLabel(run, enr.sectionId) : "",
    guardianLabel: guardianLabel(w, studentId),
    staffLabel: `${campusName(w, run.campusId)} 담당 선생님`,
    status: status === "open" ? "open" : "readonly",
    lastMessage: last ? { text: last.photoUrls.length && !last.text ? "사진" : last.text, fromRole: last.fromRole, at: last.createdAt } : null,
    unread,
    waiting: !!since,
    waitingSince: since,
    openInquiryCount: w.inquiries.filter((q) => q.chatRoomId === id && q.status !== "resolved").length,
  };
}

export function inquiryToDto(w: DemoWorld, q: DemoInquiry, opts: { mask?: boolean } = {}): InquiryDto {
  const run = runById(w, q.programRunId);
  const student = q.studentId ? w.students.find((s) => s.id === q.studentId) : undefined;
  const enr = q.studentId ? enrollmentOf(w, q.programRunId, q.studentId) : undefined;
  const name = student ? (opts.mask ? maskName(student.name) : student.name) : "";
  const studentLabel = student ? `${name}${enr ? ` (${sectionLabel(run, enr.sectionId)})` : ""}` : "학생 미지정";
  const who = (uid: string) => (uid === q.guardianUid ? "보호자" : (staffById(w, uid)?.displayName ?? "담당자"));
  return {
    id: q.id,
    programRunId: q.programRunId,
    programTitle: run.title,
    campusId: q.campusId,
    studentId: q.studentId,
    studentLabel,
    reporterLabel: q.channel === "chat" ? `${student ? `${name} ` : ""}보호자 · 앱 채팅` : `보호자 · ${q.channel === "phone" ? "전화" : "현장"} 접수`,
    kind: q.kind,
    category: q.category,
    channel: q.channel,
    title: q.title,
    body: q.body,
    photoUrls: q.photoUrls,
    status: q.status,
    resolution: q.resolution,
    resolvedAt: q.resolvedAt,
    resolvedByName: q.resolvedByUid ? staffById(w, q.resolvedByUid)?.displayName : undefined,
    officerNote: q.officerNote,
    satisfaction: q.satisfaction,
    chatRoomId: q.chatRoomId,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
    history: q.history.map((h) => ({ at: h.at, status: h.status, note: h.note, byName: who(h.byUid) })),
  };
}

export function buildRoomDetail(w: DemoWorld, v: ChatViewer, roomId: string): ChatRoomDetail {
  const parsed = parseRoomId(roomId);
  if (!parsed) throw new Error("대화방을 찾을 수 없어요.");
  const run = assertAccess(w, v, parsed.programRunId, parsed.studentId);
  if (v.kind === "guardian" && roomStatus(w, parsed.programRunId) === "hidden") throw new Error("종료된 프로그램의 대화방이에요.");
  const room = buildRoomDto(w, v, parsed.programRunId, parsed.studentId);
  const stored = w.chatRooms.find((r) => r.id === roomId);
  const otherReadAt = v.kind === "guardian" ? (stored?.lastReadAt[READ_KEY_STAFF] ?? "") : Object.entries(stored?.lastReadAt ?? {}).filter(([k]) => k !== READ_KEY_STAFF).map(([, t]) => t).sort().pop() ?? "";
  const messages: ChatMessageDto[] = roomMessages(w, roomId).map((m) => {
    const mine = v.kind === "guardian" ? m.fromRole === "guardian" && m.fromUid === v.uid : m.fromRole === "staff";
    return {
      id: m.id,
      fromRole: m.fromRole,
      fromName: nameOf(w, m, run),
      text: m.text,
      photoUrls: m.photoUrls,
      kind: m.kind,
      inquiryId: m.inquiryId,
      createdAt: m.createdAt,
      mine,
      readByOther: mine && otherReadAt >= m.createdAt,
    };
  });
  const inquiries = w.inquiries
    .filter((q) => q.chatRoomId === roomId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((q) => inquiryToDto(w, q));
  const campus = w.campuses.find((c) => c.id === run.campusId);
  return { room, messages, inquiries, hours: campus?.chatHours ?? DEFAULT_CHAT_HOURS };
}

/** 빠른 질문(준비물 · 장소)에 수업 정보로 바로 답 */
function quickAnswer(w: DemoWorld, programRunId: string, studentId: string, topic: QuickTopic): string | null {
  const run = runById(w, programRunId);
  const enr = enrollmentOf(w, programRunId, studentId);
  if (!enr) return null;
  const program = buildProgramForSection(w, run, enr.sectionId, enr.status);
  const today = todayKey().replace(/-/g, ".");
  const next = program.sessions.find((s) => !s.isCancelled && s.date.slice(0, 10) >= today);
  if (topic === "materials") {
    if (!next) return "남은 수업이 없어요. 궁금한 점은 이어서 남겨 주세요.";
    const materials = [...new Set([...(program.commonMaterials ?? []), ...next.materials])];
    return `다음 수업 안내 — ${next.date} ${next.sessionNumber}회차 ‘${next.topic}’ ${next.startTime}–${next.endTime}\n준비물: ${materials.length ? materials.join(", ") : "따로 없어요"}\n장소: ${next.location}`;
  }
  if (topic === "place") {
    const parking = program.directions?.find((d) => d.label === "주차")?.text;
    const arrive = program.directions?.find((d) => d.label === "도착하면")?.text;
    return [`장소: ${program.location}`, parking ? `주차: ${parking}` : null, arrive ? `도착하면: ${arrive}` : null].filter(Boolean).join("\n");
  }
  return null;
}

function ensureRoom(w: DemoWorld, programRunId: string, studentId: string): DemoChatRoom {
  const id = chatRoomId(programRunId, studentId);
  let room = w.chatRooms.find((r) => r.id === id);
  if (!room) {
    const run = runById(w, programRunId);
    room = { id, programRunId, campusId: run.campusId, studentId, createdAt: nowIso(), lastReadAt: {} };
    w.chatRooms.push(room);
  }
  return room;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function titleFrom(text: string, category: InquiryCategory): string {
  const first = text.replace(/\s+/g, " ").trim();
  if (!first) return `${INQUIRY_CATEGORY_LABEL[category]} 관련 요청`;
  return first.length > 24 ? `${first.slice(0, 24)}…` : first;
}

/** 메시지 보내기 (학부모 · 직원 공통) — mutateDemoWorld 안에서 부른다 */
export function sendMessageInWorld(w: DemoWorld, v: ChatViewer, input: SendChatMessageInput): void {
  const parsed = parseRoomId(input.roomId);
  if (!parsed) throw new Error("대화방을 찾을 수 없어요.");
  const run = assertAccess(w, v, parsed.programRunId, parsed.studentId);
  if (roomStatus(w, parsed.programRunId) !== "open") throw new Error("종료된 프로그램이라 메시지를 보낼 수 없어요.");
  const text = input.text.trim();
  const photos = (input.photoDataUrls ?? []).slice(0, 3);
  if (!text && photos.length === 0) throw new Error("내용을 입력해 주세요.");
  if (text.length > 1000) throw new Error("1,000자까지 보낼 수 있어요.");
  const room = ensureRoom(w, parsed.programRunId, parsed.studentId);
  const at = nowIso();
  const isGuardian = v.kind === "guardian";
  const msg: DemoChatMessage = {
    id: newId("msg"),
    roomId: room.id,
    fromUid: v.uid,
    fromRole: isGuardian ? "guardian" : "staff",
    text,
    photoUrls: photos,
    kind: isGuardian && input.quick && input.quick !== "etc" && input.quick !== "absence" ? "quick" : "text",
    createdAt: at,
  };
  w.chatMessages.push(msg);
  room.lastReadAt[readKey(v)] = at;

  if (isGuardian && input.asInquiry) {
    msg.kind = "inquiry";
    const inq: DemoInquiry = {
      id: newId("inq"),
      programRunId: run.id,
      campusId: run.campusId,
      studentId: parsed.studentId,
      guardianUid: v.uid,
      kind: "complaint",
      category: input.asInquiry.category,
      channel: "chat",
      title: titleFrom(text, input.asInquiry.category),
      body: text,
      photoUrls: photos,
      status: "received",
      chatRoomId: room.id,
      messageId: msg.id,
      createdByUid: v.uid,
      createdAt: at,
      updatedAt: at,
      history: [{ at, status: "received", byUid: v.uid }],
    };
    w.inquiries.push(inq);
    msg.inquiryId = inq.id;
    w.chatMessages.push({
      id: newId("msg"),
      roomId: room.id,
      fromUid: "system",
      fromRole: "system",
      text: "불편·요청 사항으로 접수됐어요. 처리되면 이 대화방으로 알려 드려요.",
      photoUrls: [],
      kind: "system",
      inquiryId: inq.id,
      createdAt: at,
    });
    return;
  }

  if (isGuardian && (input.quick === "materials" || input.quick === "place")) {
    const answer = quickAnswer(w, parsed.programRunId, parsed.studentId, input.quick);
    if (answer) {
      w.chatMessages.push({ id: newId("msg"), roomId: room.id, fromUid: "system", fromRole: "system", text: answer, photoUrls: [], kind: "system", createdAt: at });
      room.lastReadAt[readKey(v)] = at;
    }
  }
}

export function markReadInWorld(w: DemoWorld, v: ChatViewer, roomId: string): void {
  const parsed = parseRoomId(roomId);
  if (!parsed) return;
  assertAccess(w, v, parsed.programRunId, parsed.studentId);
  const room = w.chatRooms.find((r) => r.id === roomId);
  if (!room) return;
  room.lastReadAt[readKey(v)] = nowIso();
}

/** 학부모 방 목록 — 자녀 × (수강 중 · 예정 · 끝난 지 30일 안) */
export function guardianRooms(w: DemoWorld, uid: string): ChatRoomDto[] {
  const mine = w.students.filter((s) => s.guardianUids.includes(uid)).map((s) => s.id);
  const rows: ChatRoomDto[] = [];
  for (const e of w.enrollments) {
    if (!mine.includes(e.studentId) || e.status === "withdrawn") continue;
    if (roomStatus(w, e.programRunId) === "hidden") continue;
    rows.push(buildRoomDto(w, { kind: "guardian", uid }, e.programRunId, e.studentId));
  }
  const rank = (r: ChatRoomDto) => (r.status === "open" ? 0 : 1);
  return rows.sort(
    (a, b) =>
      (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) ||
      rank(a) - rank(b) ||
      (b.lastMessage?.at ?? "").localeCompare(a.lastMessage?.at ?? "") ||
      a.studentName.localeCompare(b.studentName, "ko"),
  );
}

/** 직원 방 목록 — 메시지가 있는 방만, 답을 기다리는 방 → 안 읽음 → 최근순 */
export function staffRooms(w: DemoWorld, v: ChatViewer & { kind: "staff" }, programRunId: string): ChatRoomDto[] {
  const run = runById(w, programRunId);
  if (v.campusIds && !v.campusIds.includes(run.campusId)) throw new Error("이 캠퍼스의 운영 건이 아니에요.");
  return w.chatRooms
    .filter((r) => r.programRunId === programRunId && w.chatMessages.some((m) => m.roomId === r.id))
    .map((r) => buildRoomDto(w, v, r.programRunId, r.studentId))
    .sort(
      (a, b) =>
        (b.waiting ? 1 : 0) - (a.waiting ? 1 : 0) ||
        (a.waitingSince ?? "").localeCompare(b.waitingSince ?? "") ||
        (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0) ||
        (b.lastMessage?.at ?? "").localeCompare(a.lastMessage?.at ?? ""),
    );
}

export function fileInquiryInWorld(w: DemoWorld, actorUid: string, campusIds: string[] | null, input: FileInquiryInput): DemoInquiry {
  const run = runById(w, input.programRunId);
  if (campusIds && !campusIds.includes(run.campusId)) throw new Error("이 캠퍼스의 운영 건이 아니에요.");
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("제목을 입력해 주세요.");
  if (!body) throw new Error("내용을 입력해 주세요.");
  const at = nowIso();
  let guardianUid: string | undefined;
  let studentId = input.studentId;
  let photos: string[] = [];
  if (input.chatRoomId && input.messageId) {
    const m = w.chatMessages.find((x) => x.id === input.messageId && x.roomId === input.chatRoomId);
    if (!m || m.fromRole !== "guardian") throw new Error("학부모 메시지만 민원으로 등록할 수 있어요.");
    if (m.inquiryId) throw new Error("이미 접수된 메시지예요.");
    guardianUid = m.fromUid;
    photos = m.photoUrls;
    studentId = parseRoomId(input.chatRoomId)?.studentId ?? studentId;
  }
  const inq: DemoInquiry = {
    id: newId("inq"),
    programRunId: run.id,
    campusId: run.campusId,
    studentId,
    guardianUid,
    kind: input.kind,
    category: input.category,
    channel: input.chatRoomId ? "chat" : input.channel,
    title,
    body,
    photoUrls: photos,
    status: "received",
    chatRoomId: input.chatRoomId,
    messageId: input.messageId,
    createdByUid: actorUid,
    createdAt: at,
    updatedAt: at,
    history: [{ at, status: "received", note: input.chatRoomId ? "채팅 메시지를 민원으로 등록" : `${input.channel === "phone" ? "전화" : "현장"} 접수`, byUid: actorUid }],
  };
  w.inquiries.push(inq);
  if (input.chatRoomId && input.messageId) {
    const m = w.chatMessages.find((x) => x.id === input.messageId);
    if (m) {
      m.kind = "inquiry";
      m.inquiryId = inq.id;
    }
    w.chatMessages.push({
      id: newId("msg"),
      roomId: input.chatRoomId,
      fromUid: "system",
      fromRole: "system",
      text: "담당 선생님이 불편·요청 사항으로 접수했어요. 처리되면 이 대화방으로 알려 드려요.",
      photoUrls: [],
      kind: "system",
      inquiryId: inq.id,
      createdAt: at,
    });
  }
  return inq;
}

export function updateInquiryInWorld(w: DemoWorld, actorUid: string, campusIds: string[] | null, input: UpdateInquiryInput): void {
  const q = w.inquiries.find((x) => x.id === input.inquiryId);
  if (!q) throw new Error("민원을 찾을 수 없어요.");
  if (campusIds && !campusIds.includes(q.campusId)) throw new Error("이 캠퍼스의 민원이 아니에요.");
  const resolution = input.resolution?.trim() ?? "";
  if (input.status === "resolved" && !resolution && !q.resolution) throw new Error("처리 내용을 적어 주세요.");
  const at = nowIso();
  const changed = q.status !== input.status;
  q.status = input.status;
  if (resolution) q.resolution = resolution;
  if (input.status === "resolved") {
    q.resolvedAt = at;
    q.resolvedByUid = actorUid;
  } else {
    q.resolvedAt = undefined;
    q.resolvedByUid = undefined;
  }
  q.updatedAt = at;
  if (changed || input.note?.trim() || resolution) {
    q.history.push({ at, status: input.status, note: input.note?.trim() || (input.status === "resolved" ? "처리 완료" : undefined), byUid: actorUid });
  }
  if (input.notifyGuardian && q.chatRoomId && input.status === "resolved") {
    w.chatMessages.push({
      id: newId("msg"),
      roomId: q.chatRoomId,
      fromUid: "system",
      fromRole: "system",
      text: `처리 완료: ${q.resolution ?? ""}`,
      photoUrls: [],
      kind: "system",
      inquiryId: q.id,
      createdAt: at,
    });
  }
}

/** 문의·민원 집계 (발주처 현황 · 보고서) */
export function inquiryStats(w: DemoWorld, programRunId: string): PartnerInquiryStats {
  const qs = w.inquiries.filter((q) => q.programRunId === programRunId);
  const complaints = qs.filter((q) => q.kind === "complaint");
  const turns = w.chatRooms.filter((r) => r.programRunId === programRunId).flatMap((r) => questionTurns(roomMessages(w, r.id)));
  const logged = qs.filter((q) => q.kind === "question");
  const answeredTurns = turns.filter((t) => t.answeredAt);
  const minutes = answeredTurns.map((t) => (new Date(t.answeredAt!).getTime() - new Date(t.at).getTime()) / 60_000);
  return {
    complaints: {
      received: complaints.length,
      inProgress: complaints.filter((q) => q.status !== "resolved").length,
      resolved: complaints.filter((q) => q.status === "resolved").length,
    },
    questions: {
      received: turns.length + logged.length,
      answered: answeredTurns.length + logged.filter((q) => q.status === "resolved").length,
      avgFirstReplyMinutes: minutes.length ? Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length) : null,
    },
  };
}

/** 센터 홈 요약 — 답을 기다리는 방 · 가장 오래 기다린 시각 · 미처리 민원 */
export function chatKpi(w: DemoWorld, programRunId: string): { chatWaiting: number; chatOldestWaitingAt: string | null; complaintsOpen: number } {
  const waits = w.chatRooms
    .filter((r) => r.programRunId === programRunId)
    .map((r) => waitingSince(roomMessages(w, r.id)))
    .filter((x): x is string => !!x)
    .sort();
  return {
    chatWaiting: waits.length,
    chatOldestWaitingAt: waits[0] ?? null,
    complaintsOpen: w.inquiries.filter((q) => q.programRunId === programRunId && q.kind === "complaint" && q.status !== "resolved").length,
  };
}
