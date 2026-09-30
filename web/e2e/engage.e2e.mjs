/**
 * 채팅 · 민원 · 만족도 · 발주처 담당자 — 실제 Functions(에뮬레이터) + 보안 규칙 통합 검증
 *
 *   준비: 에뮬레이터 실행 → seed.ts --clean → createStaffUser.ts (company · center · teacher) → engageSetup.ts
 *   실행: cd web && node e2e/engage.e2e.mjs
 *
 * 브라우저 없이 Firebase JS SDK 로 웹 앱과 같은 Callable 을 부르고, Firestore 규칙(chatRooms 읽기)을 확인한다.
 */
import { initializeApp, deleteApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, updatePassword, signOut } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions, httpsCallable } from "firebase/functions";
import { collection, connectFirestoreEmulator, doc, getDoc, getDocs, getFirestore, query, where } from "firebase/firestore";

const RUN = "run-seed-sat-001";
const PW = "Passw0rd!";
const results = [];
async function check(name, fn) {
  try {
    const d = await fn();
    results.push({ ok: true, name });
    console.log(`PASS  ${name}${d ? ` — ${d}` : ""}`);
  } catch (e) {
    results.push({ ok: false, name });
    console.log(`FAIL  ${name} — ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};
async function rejects(p, code) {
  try {
    await p;
  } catch (e) {
    if (!code || String(e.code).includes(code)) return String(e.code);
    throw new Error(`expected ${code}, got ${e.code} ${e.message}`);
  }
  throw new Error("expected rejection");
}

let n = 0;
async function as(email, password = PW) {
  const app = initializeApp({ apiKey: "demo-api-key", projectId: "demo-thinkcampus", authDomain: "demo-thinkcampus.firebaseapp.com", appId: "1:0:web:demo" }, `a${++n}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const fns = getFunctions(app, "asia-northeast3");
  connectFunctionsEmulator(fns, "127.0.0.1", 5001);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  await signInWithEmailAndPassword(auth, email, password);
  const call = async (name, data = {}) => (await httpsCallable(fns, name)(data)).data;
  return { app, auth, db, call, uid: auth.currentUser.uid };
}

const g1 = await as("guardian1@test.local");
const g2 = await as("guardian2@test.local");
const center = await as("center@thinkcampus.local");
const center2 = await as("center2@test.local");
const company = await as("company@thinkcampus.local");
const ROOM1 = `${RUN}__student-001`;
const tinyJpeg =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";

// ── 학부모 채팅 ──────────────────────────────────────────
await check("학부모 방 목록 — 자녀 2명 × 운영 건 = 2개, 대화 전", async () => {
  const { rooms } = await g1.call("listGuardianChatRooms");
  assert(rooms.length === 2, `rooms ${rooms.length}`);
  assert(rooms.every((r) => r.status === "open" && r.lastMessage === null && r.staffLabel.includes("담당 선생님")), "room shape");
  return rooms.map((r) => `${r.studentName}·${r.sectionLabel}`).join(", ");
});
await check("학부모 질문 보내기 → 방이 생기고 센터에 '답변 대기'", async () => {
  await g1.call("sendChatMessage", { roomId: ROOM1, text: "다음 주에 조금 늦을 것 같은데 괜찮을까요?" });
  const d = await g1.call("getChatRoom", { roomId: ROOM1 });
  assert(d.messages.length === 1 && d.messages[0].mine && d.messages[0].fromName.includes("박지영"), "message");
  const { rooms } = await center.call("listCenterChatRooms", { programRunId: RUN });
  const r = rooms.find((x) => x.id === ROOM1);
  assert(r && r.waiting && r.unread === 1 && r.guardianLabel.startsWith("박지영"), JSON.stringify(r));
  return `${r.guardianLabel} · 대기`;
});
await check("짧은 인사('감사합니다!')는 답변 대기로 치지 않음 · 빠른 질문(준비물)은 자동 안내", async () => {
  await g1.call("sendChatMessage", { roomId: ROOM1, text: "다음 수업 준비물이 궁금해요.", quick: "materials" });
  const d = await g1.call("getChatRoom", { roomId: ROOM1 });
  const sys = d.messages.find((m) => m.fromRole === "system");
  assert(sys && sys.text.includes("준비물") && sys.text.includes("필기도구"), sys?.text);
  await g1.call("sendChatMessage", { roomId: `${RUN}__student-002`, text: "감사합니다!" });
  const { rooms } = await center.call("listCenterChatRooms", { programRunId: RUN });
  const r = rooms.find((x) => x.id === `${RUN}__student-002`);
  assert(r && !r.waiting, "should not wait");
  return sys.text.split("\n")[0];
});
await check("장소·주차 빠른 질문 → 운영 건 안내로 답", async () => {
  await g1.call("sendChatMessage", { roomId: ROOM1, text: "수업 장소와 주차 안내가 궁금해요.", quick: "place" });
  const d = await g1.call("getChatRoom", { roomId: ROOM1 });
  const sys = [...d.messages].reverse().find((m) => m.fromRole === "system");
  assert(sys && sys.text.includes("주차: 본관 뒤 주차장"), sys?.text);
});
await check("학부모 앱 배지 — 방 문서 unreadBy (Firestore 규칙: 내 방만 읽힘)", async () => {
  await center.call("sendChatMessage", { roomId: ROOM1, text: "네, 괜찮습니다. 로비에서 기다릴게요." });
  const snap = await getDocs(query(collection(g1.db, "chatRooms"), where("guardianUids", "array-contains", g1.uid)));
  const total = snap.docs.reduce((a, d) => a + (d.data().unreadBy?.[g1.uid] ?? 0), 0);
  assert(total >= 1, `unread ${total}`);
  const code = await rejects(getDoc(doc(g2.db, "chatRooms", ROOM1)), "permission-denied");
  const code2 = await rejects(getDocs(collection(g1.db, "chatRooms", ROOM1, "messages")), "permission-denied");
  return `안 읽음 ${total} · 남의 방 ${code} · 메시지 직접 읽기 ${code2}`;
});
await check("센터 답장 → 대기 해제 · 학부모 읽음 처리 → 센터 화면 '읽음'", async () => {
  const { rooms } = await center.call("listCenterChatRooms", { programRunId: RUN });
  assert(!rooms.find((x) => x.id === ROOM1).waiting, "still waiting");
  await g1.call("markChatRead", { roomId: ROOM1 });
  const d = await center.call("getChatRoom", { roomId: ROOM1 });
  const mine = d.messages.filter((m) => m.mine);
  assert(mine.length === 1 && mine[0].readByOther && mine[0].fromName.includes("이정민"), JSON.stringify(mine));
  const snap = await getDoc(doc(g1.db, "chatRooms", ROOM1));
  assert((snap.data().unreadBy?.[g1.uid] ?? 0) === 0, "unread not cleared");
});
await check("권한 — 다른 보호자 · 다른 캠퍼스 센터는 방을 못 연다", async () => {
  const a = await rejects(g2.call("getChatRoom", { roomId: ROOM1 }), "permission-denied");
  const b = await rejects(center2.call("getChatRoom", { roomId: ROOM1 }), "permission-denied");
  const c = await rejects(center2.call("listCenterChatRooms", { programRunId: RUN }), "permission-denied");
  const d = await rejects(g1.call("getChatRoom", { roomId: "../x" }), "invalid-argument");
  return [a, b, c, d].join(" · ");
});

// ── 민원 ────────────────────────────────────────────────
let chatInquiryId = "";
await check("학부모 '불편·요청으로 접수'(사진 1장) → 민원 · 안내 메시지 · 방 처리 중 1", async () => {
  await g1.call("sendChatMessage", { roomId: ROOM1, text: "교실이 너무 추워요. 냉방을 조금 줄여 주세요.", photoDataUrls: [tinyJpeg], asInquiry: { category: "facility" } });
  const d = await g1.call("getChatRoom", { roomId: ROOM1 });
  const inq = d.inquiries[0];
  assert(inq && inq.kind === "complaint" && inq.category === "facility" && inq.status === "received" && inq.channel === "chat", JSON.stringify(inq));
  const m = d.messages.find((x) => x.inquiryId === inq.id && x.fromRole === "guardian");
  assert(m && m.kind === "inquiry" && m.photoUrls[0]?.startsWith("data:image/jpeg"), "photo/kind");
  assert(d.room.openInquiryCount === 1, `open ${d.room.openInquiryCount}`);
  chatInquiryId = inq.id;
  return inq.title;
});
await check("센터 — 민원 목록 · 상세(사진) · 처리 중 → 처리 완료(학부모 방에 알림)", async () => {
  const { inquiries } = await center.call("listInquiries", { programRunId: RUN, status: "open" });
  assert(inquiries.some((q) => q.id === chatInquiryId), "not listed");
  const { inquiry } = await center.call("getInquiry", { inquiryId: chatInquiryId });
  assert(inquiry.photoUrls.length === 1 && inquiry.studentLabel === "김민준 (1반)", inquiry.studentLabel);
  await center.call("updateInquiry", { inquiryId: chatInquiryId, status: "inProgress", note: "시설팀 점검 요청" });
  await rejects(center.call("updateInquiry", { inquiryId: chatInquiryId, status: "resolved" }), "invalid-argument");
  await center.call("updateInquiry", { inquiryId: chatInquiryId, status: "resolved", resolution: "냉방 온도를 26도로 맞췄어요.", notifyGuardian: true });
  const d = await g1.call("getChatRoom", { roomId: ROOM1 });
  const last = d.messages[d.messages.length - 1];
  assert(last.fromRole === "system" && last.text.includes("처리 완료") && d.room.openInquiryCount === 0, last.text);
  const q = d.inquiries.find((x) => x.id === chatInquiryId);
  assert(q.history.length === 3 && q.resolvedByName === "이정민", JSON.stringify(q.history));
  return `이력 ${q.history.map((h) => h.status).join("→")}`;
});
await check("센터가 채팅 메시지를 민원으로 등록 · 이미 접수된 메시지는 거절", async () => {
  await g1.call("sendChatMessage", { roomId: ROOM1, text: "활동지가 너무 어렵다고 해요." });
  const d = await center.call("getChatRoom", { roomId: ROOM1 });
  const m = [...d.messages].reverse().find((x) => x.fromRole === "guardian" && !x.inquiryId);
  const { inquiry } = await center.call("fileInquiry", { programRunId: RUN, kind: "complaint", category: "lesson", channel: "chat", title: "활동지 난이도", body: m.text, chatRoomId: ROOM1, messageId: m.id });
  assert(inquiry.channel === "chat" && inquiry.studentId === "student-001", JSON.stringify(inquiry));
  await rejects(center.call("fileInquiry", { programRunId: RUN, kind: "complaint", category: "lesson", channel: "chat", title: "x", body: "x", chatRoomId: ROOM1, messageId: m.id }), "already-exists");
  const after = await g1.call("getChatRoom", { roomId: ROOM1 });
  assert(after.room.openInquiryCount === 1, "open count");
});
await check("전화 접수 기록(문의) · 다른 캠퍼스 센터는 목록 거절", async () => {
  const { inquiry } = await center.call("fileInquiry", { programRunId: RUN, kind: "question", category: "operation", channel: "phone", title: "겨울 특강 신청", body: "겨울 특강 신청 방법 문의", studentId: "student-003" });
  assert(inquiry.reporterLabel.includes("전화") && inquiry.studentLabel.startsWith("박지호"), inquiry.reporterLabel);
  await center.call("updateInquiry", { inquiryId: inquiry.id, status: "resolved", resolution: "모집 공고 때 안내" });
  await rejects(center2.call("listInquiries", { programRunId: RUN }), "permission-denied");
});
await check("센터 홈 요약 — 답을 기다리는 대화 · 미처리 민원", async () => {
  const s = await center.call("getCenterRunSummary", { programRunId: RUN });
  assert(typeof s.dashboard.chatWaiting === "number" && s.dashboard.complaintsOpen === 1, JSON.stringify(s.dashboard));
  return `대기 ${s.dashboard.chatWaiting} · 민원 ${s.dashboard.complaintsOpen}`;
});
await check("통합 관리자 — 전체 민원 · 홈 미처리 민원", async () => {
  const { inquiries } = await company.call("listInquiries", {});
  const home = await company.call("getCompanyHome");
  assert(inquiries.length === 3 && home.complaintsOpen === 1, `${inquiries.length} / ${home.complaintsOpen}`);
});

// ── 만족도 ──────────────────────────────────────────────
await check("통합 관리자가 조사 열기 → 학부모 홈 참여 대상 2명", async () => {
  const now = Date.now();
  await company.call("upsertProgramRunSurvey", { programRunId: RUN, opensAt: new Date(now - 3600e3).toISOString(), closesAt: new Date(now + 7 * 86400e3).toISOString() });
  const { surveys } = await g1.call("listPendingSurveys");
  assert(surveys.length === 2, `pending ${surveys.length}`);
  return surveys.map((s) => s.studentName).join(", ");
});
await check("응답 — 점수 빠지면 거절 · 후기 + 공개 동의 · 수정 가능 · 목록에서 빠짐", async () => {
  const { survey } = await g1.call("getSurvey", { studentId: "student-001", programRunId: RUN });
  assert(survey.items.length === 5 && survey.status === "open" && survey.myResponse === null, "survey");
  const scores = Object.fromEntries(survey.items.map((i) => [i.id, 5]));
  await rejects(g1.call("submitSurvey", { programRunId: RUN, studentId: "student-001", scores: { overall: 5 }, review: "", consentPublic: false }), "invalid-argument");
  await g1.call("submitSurvey", { programRunId: RUN, studentId: "student-001", scores, review: "아이가 토요일만 기다려요.", consentPublic: true });
  await g1.call("submitSurvey", { programRunId: RUN, studentId: "student-002", scores: { ...scores, content: 3 }, review: "활동지가 조금 어려워요.", consentPublic: false });
  await g1.call("submitSurvey", { programRunId: RUN, studentId: "student-001", scores: { ...scores, teacher: 4 }, review: "아이가 토요일만 기다려요!", consentPublic: true });
  const { surveys } = await g1.call("listPendingSurveys");
  assert(surveys.length === 0, "still pending");
  await rejects(g2.call("submitSurvey", { programRunId: RUN, studentId: "student-001", scores, review: "", consentPublic: false }), "permission-denied");
});
await check("센터 결과 — 응답 2/3 · 후기 2건(공개 동의 표시)", async () => {
  const { results: r } = await center.call("getSurveyResults", { programRunId: RUN });
  assert(r.responses === 2 && r.eligible === 3 && r.reviews.length === 2, JSON.stringify({ a: r.responses, e: r.eligible, v: r.reviews.length }));
  const teacher = r.items.find((i) => i.id === "teacher");
  assert(teacher.avg === 4.5 && teacher.distribution[3] === 1 && teacher.distribution[4] === 1, JSON.stringify(teacher));
  return `평균 ${r.overallAvg}`;
});

// ── 발주처 담당자 ───────────────────────────────────────
let temp = "";
await check("통합 관리자 — 담당자 초대(임시 비밀번호 1회) · 목록 · 직원 이메일은 거절", async () => {
  const res = await company.call("inviteOfficer", { programRunId: RUN, email: "officer@dalseong.test", displayName: "한지원", organization: "달성군청 교육지원과", title: "주무관" });
  assert(res.tempPassword && /^Tc-[a-z]{4}\d{4}$/.test(res.tempPassword), res.tempPassword);
  temp = res.tempPassword;
  const again = await company.call("inviteOfficer", { programRunId: RUN, email: "officer@dalseong.test", displayName: "한지원", organization: "달성군청 교육지원과" });
  assert(again.tempPassword === null, "second invite should not reset password");
  await rejects(company.call("inviteOfficer", { programRunId: RUN, email: "center@thinkcampus.local", displayName: "x", organization: "y" }), "already-exists");
  await rejects(center.call("inviteOfficer", { programRunId: RUN, email: "x@y.z", displayName: "x", organization: "y" }), "permission-denied");
  const { officers } = await company.call("listOfficers", { programRunId: RUN });
  assert(officers.length === 1 && officers[0].mustChangePassword, JSON.stringify(officers));
});
let officer;
await check("담당자 첫 로그인 — 임시 비밀번호 → mustChangePassword → 비밀번호 변경 → 해제", async () => {
  officer = await as("officer@dalseong.test", temp);
  const a = await officer.call("getPartnerAccess");
  assert(a.allowed && a.mustChangePassword && a.organization === "달성군청 교육지원과", JSON.stringify(a));
  await updatePassword(officer.auth.currentUser, "NewPassw0rd1");
  await officer.call("completeOfficerPasswordChange");
  const b = await officer.call("getPartnerAccess");
  assert(!b.mustChangePassword, "still must change");
  const staff = await center.call("getPartnerAccess");
  assert(!staff.allowed, "center should not be officer");
});
await check("담당자 현황 · 수업 · 참여 · 강사진 · 만족도(공개 동의분만, 이름 가림)", async () => {
  const { runs } = await officer.call("listPartnerRuns");
  assert(runs.length === 1 && runs[0].id === RUN, JSON.stringify(runs));
  const home = await officer.call("getPartnerHome", { programRunId: RUN });
  assert(home.progress.total === 6 && home.inquiryStats.complaints.received === 2 && home.inquiryStats.complaints.resolved === 1, JSON.stringify(home.inquiryStats));
  assert(home.inquiryStats.questions.received >= 2, `questions ${home.inquiryStats.questions.received}`);
  const { lessons } = await officer.call("listPartnerLessons", { programRunId: RUN });
  assert(lessons.length === 6 && lessons[0].instructors[0].name === "박지훈", JSON.stringify(lessons[0].instructors));
  const p = await officer.call("getPartnerParticipation", { programRunId: RUN });
  assert(p.students.length === 4 && p.students.some((s) => s.name === "김민준"), p.students.map((s) => s.name).join(","));
  const ins = await officer.call("listPartnerInstructors", { programRunId: RUN });
  assert(ins.instructors[0].specialties.includes("영어") && ins.contact.phone === "053-000-0000" && ins.contact.managerName === "이정민", JSON.stringify(ins.contact));
  const { results: r } = await officer.call("getPartnerSurveyResults", { programRunId: RUN });
  assert(r.reviews.length === 1 && r.reviews[0].studentLabel.startsWith("김○준"), JSON.stringify(r.reviews));
  return `출석률 ${home.attendance.rate} · 문의 ${home.inquiryStats.questions.received}`;
});
await check("담당자 민원 — 원문 + 처리 내용 · 의견 남기기 · 센터에서 보임", async () => {
  const q = await officer.call("listPartnerInquiries", { programRunId: RUN });
  const c = q.complaints.find((x) => x.id === chatInquiryId);
  assert(c && c.body.includes("교실이 너무 추워요") && c.resolution.includes("26도"), "complaint");
  assert(q.loggedQuestions.length === 1, "logged");
  await officer.call("setOfficerNote", { inquiryId: chatInquiryId, note: "빠른 처리 감사합니다." });
  const { inquiry } = await center.call("getInquiry", { inquiryId: chatInquiryId });
  assert(inquiry.officerNote === "빠른 처리 감사합니다.", "note");
});
await check("이름 가리기 설정 → 담당자 화면 · 민원에 '김○준'", async () => {
  await company.call("updateProgramRunPartnerSettings", { programRunId: RUN, nameMasking: true });
  const p = await officer.call("getPartnerParticipation", { programRunId: RUN });
  const q = await officer.call("listPartnerInquiries", { programRunId: RUN });
  assert(p.masked && p.students.some((s) => s.name === "김○준") && q.complaints.every((c) => !c.studentLabel.includes("김민준")), "mask");
  const run = await company.call("getProgramRun", { programRunId: RUN });
  assert(run.partnerNameMasking === true, "detail flag");
});
await check("보고서 자료 한 벌 — 개요 · 회차 · 민원 · 만족도 · 연락처 없음", async () => {
  const d = await officer.call("getPartnerReportData", { programRunId: RUN });
  assert(d.run.title === "시드 토요 창의융합" && d.lessons.length === 6 && d.inquiries.complaints.length === 2 && d.survey.responses === 2, "data");
  const s = JSON.stringify(d);
  assert(!/guardianUid|birthDate|phoneHash|enrollmentCode/.test(s), "leaks private fields");
  return `${Math.round(s.length / 1024)}KB`;
});
await check("담당 외 운영 건 · 채팅방 · 운영 건 문서 직접 읽기는 막힘 (학부모는 그대로)", async () => {
  await rejects(officer.call("getPartnerHome", { programRunId: "run-other-001" }), "permission-denied");
  await rejects(officer.call("getChatRoom", { roomId: ROOM1 }), "permission-denied");
  await rejects(getDoc(doc(officer.db, "chatRooms", ROOM1)), "permission-denied");
  await rejects(getDoc(doc(officer.db, "programRuns", "run-other-001")), "permission-denied");
  const own = await getDoc(doc(g1.db, "programRuns", RUN));
  assert(own.exists(), "학부모는 운영 건 문서를 계속 읽는다");
  await rejects(g1.call("getPartnerHome", { programRunId: RUN }), "permission-denied");
});
await check("권한 해제 → 담당자 호출 거절 · 로그인 막힘", async () => {
  await company.call("revokeOfficer", { uid: officer.uid, programRunId: RUN });
  await rejects(officer.call("listPartnerRuns"), "permission-denied");
  const a = await officer.call("getPartnerAccess").catch(() => ({ allowed: false }));
  assert(!a.allowed, "still allowed");
  await signOut(officer.auth);
  await rejects(as("officer@dalseong.test", "NewPassw0rd1"), "user-disabled");
  return "user-disabled";
});
await check("다시 초대하면 운영 건이 돌아오고 로그인 가능 (임시 비밀번호 없음)", async () => {
  const r = await company.call("inviteOfficer", { programRunId: RUN, email: "officer@dalseong.test", displayName: "한지원", organization: "달성군청 교육지원과" });
  assert(r.tempPassword === null, "temp");
  const o = await as("officer@dalseong.test", "NewPassw0rd1");
  const { runs } = await o.call("listPartnerRuns");
  assert(runs.length === 1, "runs");
});

for (const a of [g1, g2, center, center2, company, officer]) if (a) await deleteApp(a.app).catch(() => {});
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
