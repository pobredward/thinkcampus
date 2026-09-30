/**
 * 체험 세계 — 학부모 채팅 · 민원 · 만족도 조사 · 발주처 담당자 시드
 *
 * 토요 창의융합(오늘 = 4회차)을 기준으로:
 *   - 채팅방 10개: 신민준 · 신서연 + 다른 학부모 8명. 한 방은 오늘 아침 질문이 아직 답을 기다린다
 *   - 민원 4건: 냉방(채팅 · 처리 완료) · 주차 안내(채팅 · 처리 완료) · 강사 지각(전화 · 처리 완료) · 활동지 난이도(채팅 · 처리 중)
 *     + 전화 문의 1건 기록
 *   - 중간 만족도 조사: 3회차 날 열림, 연결된 보호자의 약 70%가 응답 (신민준 · 신서연은 아직 — 체험에서 직접 응답)
 *   - 발주처 담당자: 달성군청 한지원 주무관(토요 창의융합 · 겨울 특강 · 봄학기), 구미시청 담당자(구미 STEAM)
 */

import type {
  DemoChatMessage,
  DemoChatRoom,
  DemoEnrollment,
  DemoGuardianLink,
  DemoInquiry,
  DemoOfficer,
  DemoRun,
  DemoRunSession,
  DemoStudent,
  DemoSurvey,
  DemoSurveyResponse,
  DemoTemplate,
} from "./world";
import { dateToKey, keyToDate } from "@/lib/dates";

const CENTER_UID = "demo-staff-center";
const GUARDIAN_UID = "demo-guardian-01076567933";
const OFFICER_UID = "demo-officer-dalseong";

const SURVEY_ITEMS: DemoSurvey["items"] = [
  { id: "overall", label: "전반 만족", question: "프로그램에 전반적으로 만족하시나요?" },
  { id: "content", label: "수업 내용", question: "수업 내용이 아이에게 알맞았나요?" },
  { id: "teacher", label: "강사", question: "선생님이 친절하고 잘 가르쳤나요?" },
  { id: "operation", label: "운영·안내", question: "공지·장소·시간 안내가 편했나요?" },
  { id: "again", label: "재참여 의향", question: "다음에도 이 프로그램에 참여하고 싶으신가요?" },
];

const REVIEWS = [
  "아이가 토요일만 기다려요. 디베이트 수업 뒤로 집에서도 자기 생각을 또박또박 말하려고 해요.",
  "회차마다 선생님 피드백이 앱으로 와서 무엇을 배웠는지 알 수 있어 좋았어요.",
  "무료 프로그램인데 수업 질이 학원보다 좋다고 느꼈습니다. 다음 학기에도 꼭 신청할게요.",
  "처음엔 주차 안내가 부족했지만 공지로 바로 알려 주셔서 이후엔 편했어요.",
  "과학 실험 수업을 특히 좋아했어요. 집에 와서 다리 만들기를 다시 해 보더라고요.",
  "아이 성향에 맞춰 칭찬해 주시는 코멘트가 인상적이었습니다.",
  "수업 시간이 조금 더 길었으면 좋겠어요. 아이가 아쉬워해요.",
  "출결 알림이 바로 와서 안심이 됐어요.",
  "강사 선생님들이 친절하시고 아이 이름을 다 기억해 주셔서 감사했어요.",
  "영어 시간에 처음 발표를 해 봤다며 뿌듯해했습니다.",
  "교실이 더웠던 날 이후로 냉방을 미리 켜 주셔서 좋았어요.",
  "활동지가 3학년에게는 조금 어려운 것 같아요. 학년별로 나눠 주시면 좋겠어요.",
];

const pad2 = (n: number) => String(n).padStart(2, "0");
function addDays(key: string, days: number): string {
  const d = keyToDate(key);
  d.setDate(d.getDate() + days);
  return dateToKey(d);
}
const at = (dateKey: string, time: string) => `${dateKey}T${time}:00+09:00`;
const mmdd = (key: string) => `${Number(key.slice(5, 7))}월 ${Number(key.slice(8, 10))}일`;

export function seedEngagement(ctx: {
  rnd: () => number;
  today: string;
  aDates: string[];
  runA: DemoRun;
  runB: DemoRun;
  runC: DemoRun;
  runP1: DemoRun;
  students: DemoStudent[];
  enrollments: DemoEnrollment[];
  guardianLinks: DemoGuardianLink[];
  runSessions: DemoRunSession[];
  templates: DemoTemplate[];
}): {
  chatRooms: DemoChatRoom[];
  chatMessages: DemoChatMessage[];
  inquiries: DemoInquiry[];
  surveys: DemoSurvey[];
  surveyResponses: DemoSurveyResponse[];
  officers: DemoOfficer[];
} {
  const { rnd, today, aDates, runA, runB, runC, runP1, students, enrollments, guardianLinks, runSessions, templates } = ctx;
  const chatRooms: DemoChatRoom[] = [];
  const chatMessages: DemoChatMessage[] = [];
  const inquiries: DemoInquiry[] = [];
  let mSeq = 0;
  let iSeq = 0;

  const roomFor = (studentId: string, createdAt: string): DemoChatRoom => {
    const id = `${runA.id}__${studentId}`;
    let room = chatRooms.find((r) => r.id === id);
    if (!room) {
      room = { id, programRunId: runA.id, campusId: runA.campusId, studentId, createdAt, lastReadAt: {} };
      chatRooms.push(room);
    }
    return room;
  };
  const guardianOf = (studentId: string) => guardianLinks.find((l) => l.studentId === studentId)?.guardianUid ?? "";
  const say = (room: DemoChatRoom, fromRole: DemoChatMessage["fromRole"], text: string, when: string, extra: Partial<DemoChatMessage> = {}) => {
    const m: DemoChatMessage = {
      id: `msg-${String(++mSeq).padStart(4, "0")}`,
      roomId: room.id,
      fromUid: fromRole === "guardian" ? guardianOf(room.studentId) : fromRole === "staff" ? CENTER_UID : "system",
      fromRole,
      text,
      photoUrls: [],
      kind: fromRole === "system" ? "system" : "text",
      createdAt: when,
      ...extra,
    };
    chatMessages.push(m);
    return m;
  };
  const complaint = (d: Omit<DemoInquiry, "id" | "photoUrls" | "history" | "updatedAt"> & { history: Array<{ at: string; status: DemoInquiry["status"]; note?: string }> }) => {
    const inq: DemoInquiry = {
      ...d,
      id: `inq-${String(++iSeq).padStart(3, "0")}`,
      photoUrls: [],
      updatedAt: d.history[d.history.length - 1].at,
      history: d.history.map((h) => ({ ...h, byUid: h.status === "received" && d.channel === "chat" ? (d.guardianUid ?? CENTER_UID) : CENTER_UID })),
    };
    inquiries.push(inq);
    return inq;
  };
  const markRead = (room: DemoChatRoom, who: string, when: string) => {
    room.lastReadAt[who] = when;
  };

  // ── 신민준 (1반) — 준비물 · 픽업 문의 ──
  const minjunRoom = roomFor("student-001", at(addDays(aDates[2], -3), "20:00"));
  say(minjunRoom, "guardian", "안녕하세요, 3회차 한국사 수업 준비물이 따로 있을까요?", at(addDays(aDates[2], -2), "20:10"));
  say(minjunRoom, "staff", "안녕하세요, 달성캠퍼스 이정민입니다. 3회차는 필기도구와 개인 물병만 챙겨 주시면 돼요. 활동지는 교실에서 드려요.", at(addDays(aDates[2], -2), "20:41"));
  say(minjunRoom, "guardian", "감사합니다!", at(addDays(aDates[2], -2), "20:45"));
  say(minjunRoom, "guardian", "내일 수업 끝나고 픽업이 10분 정도 늦을 것 같은데 괜찮을까요?", at(addDays(today, -1), "21:05"));
  say(minjunRoom, "staff", "네, 괜찮습니다. 1층 로비에서 선생님이 함께 기다릴게요. 도착하시면 안내데스크에 말씀해 주세요.", at(addDays(today, -1), "21:22"));
  // 마지막 답장은 아직 안 읽음 → 채팅 탭에 배지 1
  markRead(minjunRoom, GUARDIAN_UID, at(addDays(today, -1), "21:06"));
  markRead(minjunRoom, "staff", at(addDays(today, -1), "21:22"));

  // ── 신서연 (4반) — 냉방 민원 (채팅 접수 → 처리 완료) ──
  const seoyeonRoom = roomFor("student-002", at(aDates[2], "15:30"));
  const heatMsg = say(seoyeonRoom, "guardian", "오늘 교실이 너무 더웠다고 아이가 많이 힘들어했어요. 냉방 확인 부탁드려요.", at(aDates[2], "15:32"), { kind: "inquiry" });
  const heat = complaint({
    programRunId: runA.id,
    campusId: runA.campusId,
    studentId: "student-002",
    guardianUid: GUARDIAN_UID,
    kind: "complaint",
    category: "facility",
    channel: "chat",
    title: "교실이 너무 더워요",
    body: heatMsg.text,
    status: "resolved",
    resolution: "수련관 시설팀과 냉방기를 점검했고, 다음 회차부터 수업 30분 전에 냉방을 켜 두기로 했어요. 교실에 선풍기 2대도 추가로 두었습니다.",
    resolvedAt: at(addDays(aDates[2], 2), "11:10"),
    resolvedByUid: CENTER_UID,
    satisfaction: 5,
    chatRoomId: seoyeonRoom.id,
    messageId: heatMsg.id,
    createdByUid: GUARDIAN_UID,
    createdAt: heatMsg.createdAt,
    history: [
      { at: heatMsg.createdAt, status: "received" },
      { at: at(aDates[2], "16:05"), status: "inProgress", note: "수련관 시설팀에 점검 요청" },
      { at: at(addDays(aDates[2], 2), "11:10"), status: "resolved", note: "냉방기 점검 · 사전 가동 · 선풍기 추가" },
    ],
  });
  heatMsg.inquiryId = heat.id;
  say(seoyeonRoom, "system", "불편·요청 사항으로 접수됐어요. 처리되면 이 대화방으로 알려 드려요.", at(aDates[2], "15:32"), { inquiryId: heat.id });
  say(seoyeonRoom, "staff", "불편을 드려 죄송합니다. 수련관 시설팀에 바로 점검을 요청했어요. 결과 알려 드릴게요.", at(aDates[2], "16:05"));
  say(seoyeonRoom, "system", `처리 완료: ${heat.resolution}`, at(addDays(aDates[2], 2), "11:10"), { inquiryId: heat.id });
  say(seoyeonRoom, "guardian", "빠르게 챙겨 주셔서 감사해요. 이번 주엔 괜찮았다고 하네요.", at(addDays(aDates[2], 3), "19:40"));
  markRead(seoyeonRoom, GUARDIAN_UID, at(addDays(aDates[2], 3), "19:40"));
  markRead(seoyeonRoom, "staff", at(addDays(aDates[2], 3), "20:00"));

  // ── 다른 학부모 8명 ──
  const others = enrollments
    .filter((e) => e.programRunId === runA.id && e.studentId !== "student-001" && e.studentId !== "student-002")
    .filter((e) => students.find((s) => s.id === e.studentId)?.guardianUids.length)
    .sort((a, b) => a.studentId.localeCompare(b.studentId));
  const pick = (sectionId: string, nth: number) => others.filter((e) => e.sectionId === sectionId)[nth]?.studentId;
  const tplA = templates.find((t) => t.id === runA.programTemplateId);
  const s4 = tplA?.sessions.find((x) => x.order === 4);

  const conv: Array<{ student?: string; lines: Array<[DemoChatMessage["fromRole"], string, string, Partial<DemoChatMessage>?]> }> = [
    {
      student: pick("sec-2", 0),
      lines: [
        ["guardian", "아이가 감기 기운이 있어서 이번 수업은 쉬어도 될까요? 결석 처리되나요?", at(addDays(aDates[1], -1), "19:20")],
        ["staff", "쾌차를 바랍니다. 이번 회차는 결석으로 기록되지만 활동지는 다음 시간에 챙겨 드릴게요. 결석 2회까지는 수료에 문제없어요.", at(addDays(aDates[1], -1), "19:48")],
      ],
    },
    {
      student: pick("sec-3", 0),
      lines: [
        ["guardian", "수업 끝나는 시간이 12시 맞나요? 픽업은 어디서 하면 되나요?", at(addDays(aDates[0], -2), "10:15")],
        ["staff", "네, 12시에 끝나요. 선생님이 1층 로비까지 함께 내려가 보호자께 인계해 드려요.", at(addDays(aDates[0], -2), "10:32")],
        ["guardian", "네 알겠습니다!", at(addDays(aDates[0], -2), "10:34")],
      ],
    },
    {
      student: pick("sec-4", 1),
      lines: [
        ["guardian", "다음 수업 준비물이 있나요?", at(addDays(today, -2), "18:02"), { kind: "quick" }],
        [
          "system",
          `다음 수업 안내 — ${mmdd(today)} 4회차 ‘${s4?.topic ?? "사고·창의력 디베이트"}’\n준비물: ${(s4?.materials ?? ["필기도구"]).join(", ")}\n장소: ${runA.location}`,
          at(addDays(today, -2), "18:02"),
        ],
        ["guardian", "감사합니다 확인했어요.", at(addDays(today, -2), "18:05")],
      ],
    },
    {
      student: pick("sec-1", 2),
      lines: [
        ["guardian", "수업 사진은 앱에 올라오나요?", at(addDays(aDates[1], 1), "09:40")],
        ["staff", "수업 사진은 회차별 리포트에 함께 올려 드릴 예정이에요. 초상권 동의서를 내신 학생만 올라가요.", at(addDays(aDates[1], 1), "10:12")],
      ],
    },
    {
      student: pick("sec-6", 0),
      lines: [
        ["guardian", "다음 회차가 언제인가요? 연휴랑 겹치나요?", at(addDays(aDates[3], -5), "21:00")],
        ["staff", `다음 수업은 ${mmdd(aDates[3])} 4회차예요. 연휴와 겹치지 않아요.`, at(addDays(aDates[3], -4), "09:20")],
      ],
    },
    {
      student: pick("sec-3", 3),
      lines: [
        ["guardian", "형제가 같이 다니는데 같은 반으로 할 수 있을까요?", at(addDays(aDates[0], -5), "13:10")],
        ["staff", "학년별로 반이 나뉘어 같은 반은 어려워요. 대신 두 아이 모두 오전 반(10:00)으로 맞춰 드렸어요.", at(addDays(aDates[0], -5), "13:45")],
      ],
    },
  ];
  for (const c of conv) {
    if (!c.student) continue;
    const room = roomFor(c.student, c.lines[0][2]);
    for (const [role, text, when, extra] of c.lines) say(room, role, text, when, extra ?? {});
    const last = c.lines[c.lines.length - 1][2];
    markRead(room, guardianOf(c.student), last);
    markRead(room, "staff", last);
  }

  // 주차 안내 (채팅 민원 → 처리 완료, 공지로 안내)
  const parkStudent = pick("sec-5", 0);
  if (parkStudent) {
    const room = roomFor(parkStudent, at(addDays(today, -10), "12:30"));
    const m = say(room, "guardian", "주차장이 공사 중이라 어디에 세워야 할지 몰라 한참 헤맸어요. 미리 안내가 있었으면 좋겠어요.", at(addDays(today, -10), "12:31"), { kind: "inquiry" });
    const inq = complaint({
      programRunId: runA.id,
      campusId: runA.campusId,
      studentId: parkStudent,
      guardianUid: guardianOf(parkStudent),
      kind: "complaint",
      category: "operation",
      channel: "chat",
      title: "주차 안내가 부족해요",
      body: m.text,
      status: "resolved",
      resolution: `후문 임시 주차장 안내를 전체 학부모께 공지로 보냈고(${mmdd(addDays(today, -8))}), 수업 날 정문에 안내 표지판을 세웠어요.`,
      resolvedAt: at(addDays(today, -8), "09:05"),
      resolvedByUid: CENTER_UID,
      satisfaction: 4,
      chatRoomId: room.id,
      messageId: m.id,
      createdByUid: guardianOf(parkStudent),
      createdAt: m.createdAt,
      history: [
        { at: m.createdAt, status: "received" },
        { at: at(addDays(today, -10), "13:05"), status: "inProgress", note: "수련관에 공사 일정 확인" },
        { at: at(addDays(today, -8), "09:05"), status: "resolved", note: "전체 공지 발송 · 표지판 설치" },
      ],
    });
    m.inquiryId = inq.id;
    say(room, "system", "불편·요청 사항으로 접수됐어요. 처리되면 이 대화방으로 알려 드려요.", m.createdAt, { inquiryId: inq.id });
    say(room, "staff", "불편을 드려 죄송합니다. 수련관에 공사 일정을 확인하고 안내를 준비할게요.", at(addDays(today, -10), "13:05"));
    say(room, "system", `처리 완료: ${inq.resolution}`, at(addDays(today, -8), "09:05"), { inquiryId: inq.id });
    markRead(room, guardianOf(parkStudent), at(addDays(today, -8), "12:00"));
    markRead(room, "staff", at(addDays(today, -8), "09:05"));
  }

  // 활동지 난이도 (채팅 민원 → 처리 중)
  const levelStudent = pick("sec-6", 2);
  if (levelStudent) {
    const room = roomFor(levelStudent, at(addDays(today, -3), "20:10"));
    const m = say(room, "guardian", "아이가 3학년인데 활동지가 너무 어렵다고 해요. 학년에 맞게 조절해 주실 수 있을까요?", at(addDays(today, -3), "20:12"), { kind: "inquiry" });
    const inq = complaint({
      programRunId: runA.id,
      campusId: runA.campusId,
      studentId: levelStudent,
      guardianUid: guardianOf(levelStudent),
      kind: "complaint",
      category: "lesson",
      channel: "chat",
      title: "활동지가 어려워요",
      body: m.text,
      status: "inProgress",
      chatRoomId: room.id,
      messageId: m.id,
      createdByUid: guardianOf(levelStudent),
      createdAt: m.createdAt,
      history: [
        { at: m.createdAt, status: "received" },
        { at: at(addDays(today, -2), "10:20"), status: "inProgress", note: "담당 강사와 학년별 활동지 준비 협의" },
      ],
    });
    m.inquiryId = inq.id;
    say(room, "system", "불편·요청 사항으로 접수됐어요. 처리되면 이 대화방으로 알려 드려요.", m.createdAt, { inquiryId: inq.id });
    say(room, "staff", "말씀 감사합니다. 담당 강사와 상의해 3~4학년용 활동지를 따로 준비하고 있어요. 다음 회차 전에 다시 안내드릴게요.", at(addDays(today, -2), "10:20"));
    markRead(room, guardianOf(levelStudent), at(addDays(today, -2), "12:00"));
    markRead(room, "staff", at(addDays(today, -2), "10:20"));
  }

  // 오늘 아침 — 아직 답을 기다리는 질문
  const waitStudent = pick("sec-2", 3);
  if (waitStudent) {
    const room = roomFor(waitStudent, at(today, "08:50"));
    say(room, "guardian", "오늘 가족 행사가 있어서 11시 40분쯤 조금 일찍 데려가도 될까요?", at(today, "08:52"));
    markRead(room, guardianOf(waitStudent), at(today, "08:52"));
  }

  // 전화 민원 · 전화 문의 (채팅방 없음)
  const lateStudent = pick("sec-3", 1);
  complaint({
    programRunId: runA.id,
    campusId: runA.campusId,
    studentId: lateStudent,
    kind: "complaint",
    category: "instructor",
    channel: "phone",
    title: "강사가 수업에 늦게 들어왔어요",
    body: "3반 수업에 강사가 10분 정도 늦게 들어와 아이들이 교실에서 기다렸다는 학부모 전화.",
    status: "resolved",
    resolution: "담당 강사 지각 사실을 확인했어요. 강사에게 주의를 주고 수업 20분 전 도착 원칙을 다시 안내했으며, 해당 학부모께 사과 전화를 드렸습니다.",
    resolvedAt: at(addDays(aDates[2], 1), "10:30"),
    resolvedByUid: CENTER_UID,
    createdByUid: CENTER_UID,
    createdAt: at(aDates[2], "13:20"),
    history: [
      { at: at(aDates[2], "13:20"), status: "received", note: "전화 접수" },
      { at: at(aDates[2], "17:00"), status: "inProgress", note: "강사 면담" },
      { at: at(addDays(aDates[2], 1), "10:30"), status: "resolved", note: "재발 방지 안내 · 학부모 사과 전화" },
    ],
  });
  complaint({
    programRunId: runA.id,
    campusId: runA.campusId,
    kind: "question",
    category: "operation",
    channel: "phone",
    title: "겨울방학 특강 신청 방법",
    body: "토요 창의융합 수강생도 겨울방학 STEAM 특강을 신청할 수 있는지 묻는 전화.",
    status: "resolved",
    resolution: "신청 가능하며, 모집 공고가 나오면 앱 공지로 안내드린다고 답변했어요.",
    resolvedAt: at(addDays(today, -6), "14:12"),
    resolvedByUid: CENTER_UID,
    createdByUid: CENTER_UID,
    createdAt: at(addDays(today, -6), "14:05"),
    history: [
      { at: at(addDays(today, -6), "14:05"), status: "received", note: "전화 접수" },
      { at: at(addDays(today, -6), "14:12"), status: "resolved", note: "전화로 바로 답변" },
    ],
  });

  // ── 만족도 조사 (중간) ──
  const surveys: DemoSurvey[] = [
    {
      programRunId: runA.id,
      title: "토요 창의융합 중간 만족도 조사",
      intro: "지금까지의 수업은 어떠셨나요? 1분이면 끝나요. 답변은 수업 개선과 달성군 사업 보고에 쓰여요.",
      items: SURVEY_ITEMS,
      allowReview: true,
      consentLabel: "후기를 달성군과 다른 학부모에게 공개해도 좋아요 (이름은 가려져요)",
      opensAt: at(aDates[2], "12:00"),
      closesAt: at(addDays(aDates[5], 14), "23:59"),
    },
  ];
  const surveyResponses: DemoSurveyResponse[] = [];
  const eligible = enrollments
    .filter((e) => e.programRunId === runA.id && e.studentId !== "student-001" && e.studentId !== "student-002")
    .filter((e) => (students.find((s) => s.id === e.studentId)?.guardianUids.length ?? 0) > 0);
  let reviewIdx = 0;
  for (const e of eligible) {
    if (rnd() > 0.72) continue;
    const base = rnd() < 0.7 ? 5 : 4;
    const clamp = (n: number) => Math.max(1, Math.min(5, n));
    const scores: Record<string, number> = {
      overall: base,
      content: clamp(base - (rnd() < 0.25 ? 1 : 0)),
      teacher: clamp(base + (rnd() < 0.3 ? 1 : 0) - (rnd() < 0.08 ? 1 : 0)),
      operation: clamp(base - (rnd() < 0.35 ? 1 : 0) - (rnd() < 0.08 ? 1 : 0)),
      again: clamp(base - (rnd() < 0.15 ? 1 : 0)),
    };
    const writes = rnd() < 0.3 && reviewIdx < REVIEWS.length;
    const dayOffset = Math.floor(rnd() * Math.max(1, (keyToDate(today).getTime() - keyToDate(aDates[2]).getTime()) / 86_400_000));
    surveyResponses.push({
      id: `${runA.id}_${e.studentId}`,
      programRunId: runA.id,
      studentId: e.studentId,
      guardianUid: guardianOf(e.studentId),
      scores,
      review: writes ? REVIEWS[reviewIdx++] : "",
      consentPublic: writes ? rnd() < 0.75 : false,
      submittedAt: at(addDays(aDates[2], dayOffset), `${pad2(9 + Math.floor(rnd() * 12))}:${pad2(Math.floor(rnd() * 60))}`),
    });
  }

  // ── 발주처 담당자 ──
  const officers: DemoOfficer[] = [
    {
      uid: OFFICER_UID,
      displayName: "한지원",
      email: "officer@dalseong.demo.thinkcampus.kr",
      organization: "달성군청 교육지원과",
      title: "주무관",
      programRunIds: [runA.id, runB.id, runP1.id],
      mustChangePassword: false,
      createdAt: at(addDays(aDates[0], -20), "10:00"),
      lastLoginAt: at(addDays(today, -1), "16:20"),
    },
    {
      uid: "demo-officer-gumi",
      displayName: "오세영",
      email: "officer@gumi.demo.thinkcampus.kr",
      organization: "구미시청 교육청소년과",
      title: "주무관",
      programRunIds: [runC.id],
      mustChangePassword: true,
      createdAt: at(addDays(today, -12), "11:00"),
    },
  ];

  // runSessions 는 지금 쓰지 않지만(회차 날짜는 aDates) 이후 시드 확장용으로 받는다
  void runSessions;

  return { chatRooms, chatMessages, inquiries, surveys, surveyResponses, officers };
}
