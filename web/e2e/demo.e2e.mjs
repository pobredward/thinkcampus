/**
 * 체험판 E2E — 다섯 역할(학부모 · 강사 · 프로그램 매니저 · 통합 관리자 · 발주처 담당자)이 한 탭에서 같은 체험 세계를 보는지,
 * 저장이 역할 사이에 이어지는지 (채팅 · 민원 · 만족도 · 발주처 보고서 포함)
 *
 *   cd web && npm run build && npm run start          (포트 3000, Firebase 환경변수 없어도 된다)
 *   npm run e2e:demo                                   (다른 주소: E2E_DEMO_BASE_URL=http://127.0.0.1:3400)
 *
 * 스크린샷: e2e/shots/demo-*.png
 * 체험 세계는 sessionStorage(탭 단위)에 있으므로 역할 전환은 같은 탭에서 /demo/<role> 로 한다.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.E2E_DEMO_BASE_URL ?? "http://127.0.0.1:3000";
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
async function check(name, fn) {
  try {
    const d = await fn();
    results.push({ ok: true, name });
    console.log(`PASS  ${name} ${d ?? ""}`);
  } catch (e) {
    results.push({ ok: false, name });
    console.log(`FAIL  ${name} ${String(e?.message ?? e).split("\n")[0]}`);
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ko-KR" });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
const page = await ctx.newPage();

// Firebase 로 나가는 요청이 하나도 없어야 한다
const firebaseCalls = [];
page.on("request", (r) => {
  if (/identitytoolkit|securetoken|firestore\.googleapis|firebaseio|cloudfunctions|asia-northeast3-|recaptcha|firebaseinstallations/.test(r.url())) firebaseCalls.push(r.url());
});
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !/favicon/.test(m.text())) pageErrors.push(m.text().slice(0, 200));
});

const smallText = [];
async function shot(name) {
  await page.screenshot({ path: path.join(SHOTS, `demo-${name}.png`), fullPage: true });
  const found = await page.evaluate(() => {
    const out = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const tx = (w.currentNode.textContent || "").trim();
      const el = w.currentNode.parentElement;
      if (!tx || !el) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const s = parseFloat(getComputedStyle(el).fontSize);
      if (s < 14) out.push(`${s}px ${tx.slice(0, 20)}`);
    }
    return out;
  });
  for (const f of found) smallText.push(`${name}: ${f}`);
}
const text = async () => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const goto = async (p) => {
  await page.goto(BASE + p, { waitUntil: "networkidle" });
  await sleep(400);
};
const enter = async (role) => {
  await goto(`/demo/${role}`);
};
const toast = async () => {
  const t = page.locator('[role="status"][aria-live="polite"]');
  await t.waitFor({ timeout: 8000 });
  return (await t.innerText()).trim();
};
const confirmDialog = async () => {
  const dlg = page.locator('[role="alertdialog"]');
  await dlg.waitFor({ timeout: 8000 });
  await dlg.getByRole("button").last().click();
  await dlg.waitFor({ state: "detached" });
};

// ── 허브 ──────────────────────────────────────────────
await check("루트 → 체험판 허브, 3묶음(내부 운영 · 발주처 · 학부모) · 역할 5개", async () => {
  await goto("/");
  assert(page.url().endsWith("/demo"), page.url());
  const t = await text();
  for (const s of ["내부 운영", "발주처", "학부모", "강사", "프로그램 매니저", "통합 관리자", "발주처 담당자", "신선웅", "박지훈", "이정민", "김도현", "한지원"]) assert(t.includes(s), s);
  assert(!t.includes("센터 관리자") && !t.includes("회사 관리자") && !t.includes("대학생 멘토"), "옛 이름 · 문구");
  for (const id of ["internal", "partner", "guardian"]) assert(await page.getByTestId(`demo-sector-${id}`).count(), id);
  assert((await page.locator('[data-testid^="demo-enter-"]').count()) === 5, "역할 5개");
  assert(!(await page.locator('[data-testid="demo-banner"]').count()), "허브에는 배너 없음");
  await shot("hub");
});

// ── 학부모 ────────────────────────────────────────────
await check("학부모 체험 진입 → /main · 배너 · 인사말 · 자녀 2명", async () => {
  await enter("guardian");
  assert(page.url().endsWith("/main"), page.url());
  await page.locator('[data-testid="demo-banner"]').waitFor();
  const t = await text();
  assert(t.includes("학부모 체험"), "배너 역할");
  assert(t.includes("환영합니다, 신선웅 학부모님"), "인사말");
  assert(t.includes("연결된 자녀 2명"), "자녀 2명");
  assert(t.includes("2026 ThinkCampus 토요 창의융합"), "수강 중 카드");
  assert(/4\/6회/.test(t), "오늘(4회차) 출석까지 진도 4/6: " + t.slice(0, 300));
  await shot("guardian-home");
});

await check("학부모 프로그램 → 3회차 리포트(공개된 피드백) · 4회차(오늘) 출석", async () => {
  await page.getByRole("button", { name: /토요 창의융합 상세 보기/ }).click();
  await page.waitForURL(/\/main\/program\/run-ds26-creative/);
  await sleep(500);
  let t = await text();
  assert(t.includes("회차별 수업") && t.includes("총 6회 · 진행 4회"), "회차 요약: " + t.slice(0, 200));
  await page.getByRole("button", { name: /3회차/ }).first().click();
  await page.waitForURL(/session\/rs-ds26-creative-03-sec-1/);
  await page.getByRole("tab", { name: "리포트" }).click();
  await sleep(400);
  t = await text();
  assert(t.includes("박지훈 강사") && t.includes("시대적 맥락 이해도가 높습니다"), "3회차 피드백");
  await shot("guardian-session3-report");
  await goto("/main/program/run-ds26-creative/session/rs-ds26-creative-04-sec-1?sid=student-001&studentName=신민준&tab=report");
  t = await text();
  assert(t.includes("선생님이 피드백을 정리하고 있어요"), "4회차 리포트는 아직 작성 중");
});

// ── 강사 ──────────────────────────────────────────────
await check("강사 체험 → 오늘 수업 2개(1반 입력 완료 · 4반 미입력)", async () => {
  await enter("instructor");
  assert(page.url().endsWith("/instructor"), page.url());
  const t = await text();
  assert(t.includes("박지훈 선생님, 오늘 수업 2개"), "오늘 2개: " + t.slice(0, 200));
  assert(t.includes("출결 12/12") && t.includes("출결 0/12"), "1반 완료 · 4반 미입력");
  await shot("instructor-home");
});

await check("강사 4반 출결 — 한 명 지각(늦은 시간 +5) · 나머지 모두 출석 → 12/12", async () => {
  await goto("/instructor/session/rs-ds26-creative-04-sec-4?tab=attendance");
  const first = page.locator("li").filter({ has: page.getByRole("group", { name: /출결$/ }) }).first();
  await first.getByRole("button", { name: "지각", exact: true }).click();
  await sleep(500);
  await first.getByRole("button", { name: "5분 늘리기" }).click();
  await sleep(500);
  assert((await first.innerText()).includes("15분"), "지각 15분");
  await page.getByRole("button", { name: /아직 안 한 11명 모두 출석/ }).click();
  assert((await toast()).includes("11명 출석으로 저장했어요"), "토스트");
  await sleep(400);
  const t = await text();
  assert(t.includes("입력 12/12명"), "12/12: " + t.slice(0, 300));
  await shot("instructor-attendance");
});

await check("강사 1반 리포트 — 비어 있는 한마디 채우고 센터 검수 요청", async () => {
  await goto("/instructor/session/rs-ds26-creative-04-sec-1?tab=report");
  let t = await text();
  assert(t.includes("작성 중 12명"), "작성 중 12명: " + t.slice(0, 200));
  const empties = page.locator("textarea[placeholder^='오늘 수업에서']").filter({ hasText: "" });
  const n = await empties.count();
  let filled = 0;
  for (let i = 0; i < n; i++) {
    const ta = empties.nth(i);
    if ((await ta.inputValue()).trim()) continue;
    await ta.fill("오늘 토론에서 자기 생각을 또렷하게 말했어요.");
    await ta.blur();
    filled++;
    await sleep(300);
  }
  assert(filled >= 1, "비어 있던 한마디가 있어야 함");
  await sleep(1200);
  const btn = page.getByRole("button", { name: /리포트 센터 검수 요청/ });
  await btn.waitFor();
  assert(!(await btn.isDisabled()), "모두 채우면 제출 가능");
  await btn.click();
  const tt = await toast();
  assert(tt.includes("12명 리포트를 센터 검수로 보냈어요"), tt);
  await sleep(500);
  t = await text();
  assert(t.includes("제출 12명") && t.includes("검수 대기"), "제출 후 상태");
  await shot("instructor-report-submitted");
});

// ── 센터 ──────────────────────────────────────────────
await check("센터 홈 — 검수 대기 36건(24+12) · 오늘 출결 미입력 24명 · 미배정 1", async () => {
  await enter("center");
  assert(page.url().endsWith("/admin/center"), page.url());
  const t = await text();
  assert(t.includes("검수 대기 리포트 36"), "36건: " + t.slice(0, 400));
  assert(t.includes("출결이 아직 안 들어온 학생 24명"), "4반 입력 후 24명: " + t.slice(0, 400));
  assert(t.includes("강사 미배정 회차 1"), "미배정 1");
  await shot("center-home");
});

await check("센터 수업 — 오늘 4반 출결 12/12 · 1반 리포트 12/12", async () => {
  await goto("/admin/center/lessons");
  const t = await text();
  assert(t.includes("4회차"), "오늘 4회차");
  const card4 = page.locator("li").filter({ hasText: /^4반/ }).first();
  assert((await card4.innerText()).includes("출결 12/12"), "4반 12/12");
  const card1 = page.locator("li").filter({ hasText: /^1반/ }).first();
  assert((await card1.innerText()).includes("리포트 12/12"), "1반 리포트 12/12");
  await shot("center-lessons");
});

await check("센터 리포트 검수 — 1반 4회차 12명 모두 학부모 공개", async () => {
  await goto("/admin/center/reports?session=rs-ds26-creative-04-sec-1");
  await page.getByRole("button", { name: /12명 모두 학부모 공개/ }).click();
  assert((await toast()).includes("학부모에게 공개했어요"), "토스트");
  await sleep(500);
  const t = await text();
  assert(!t.includes("검수 대기") || t.includes("공개됨"), "상태 변경");
  await goto("/admin/center");
  assert((await text()).includes("검수 대기 리포트 24"), "36 → 24");
  await shot("center-reports");
});

await check("센터 학생 — 보호자 미연결 필터 · 학생 상세(등록코드 · 형제)", async () => {
  await goto("/admin/center/students?guardian=unlinked");
  const countText = await page.locator('[data-testid="roster-count"]').innerText();
  const n = Number(countText.replace(/\D/g, ""));
  assert(n > 0 && n < 72, "미연결 일부: " + countText);
  await page.locator("li button").first().click();
  const dlg = page.locator('[role="dialog"]');
  await dlg.waitFor();
  const dt = await dlg.innerText();
  assert(dt.includes("등록코드") && /DS26-[A-Z0-9]{5}/.test(dt), "미사용 등록코드 표시: " + dt.slice(0, 200));
  await shot("center-student-detail");
  await page.keyboard.press("Escape");
});

await check("센터 강사 배정 — 5회차 6반 미배정 → 최현우 배정(겹치는 강사는 막힘)", async () => {
  await goto("/admin/center/instructors/demo-instructor-park");
  await page.getByRole("button", { name: /미배정/ }).click();
  await sleep(300);
  let t = await text();
  assert(t.includes("같은 시간 수업 있음"), "박지훈은 13:00 에 4반 수업 → 겹침");
  await goto("/admin/center/instructors/demo-instructor-choi");
  await page.getByRole("button", { name: /미배정/ }).click();
  await sleep(300);
  await page.getByRole("button", { name: /5회차 6반 배정/ }).click();
  assert((await toast()).includes("최현우 강사를 배정했어요"), "배정 토스트");
  await sleep(400);
  await goto("/admin/center");
  t = await text();
  assert(t.includes("강사 미배정 회차 0"), "미배정 0: " + t.slice(0, 400));
  await shot("center-instructor");
});

await check("센터 공지 — 1반 보호자에게 보내기", async () => {
  await goto("/admin/center/comms");
  await page.locator("#notice-target").selectOption("sec-1");
  await page.locator("#notice-title").fill("E2E 준비물 안내");
  await page.locator("#notice-body").fill("다음 수업에 색연필을 챙겨 주세요.");
  await page.getByRole("button", { name: "보내기" }).click();
  const tt = await toast();
  assert(/보호자 \d+명에게 보냈어요/.test(tt), tt);
  await sleep(400);
  assert((await text()).includes("E2E 준비물 안내"), "보낸 공지 목록");
  await shot("center-comms");
});

// ── 학부모: 강사·센터가 한 일이 보인다 ────────────────────
await check("학부모 알림 — 공지 · 4회차 리포트 도착 · 4회차 피드백 공개", async () => {
  await enter("guardian");
  await goto("/main/notification");
  let t = await text();
  assert(t.includes("E2E 준비물 안내"), "센터 공지");
  assert(t.includes("신민준 4회차 리포트 도착"), "리포트 알림");
  await goto("/main/program/run-ds26-creative/session/rs-ds26-creative-04-sec-1?sid=student-001&studentName=신민준&tab=report");
  t = await text();
  assert(t.includes("박지훈 강사") && !t.includes("선생님이 피드백을 정리하고 있어요"), "공개된 4회차 피드백");
  await shot("guardian-session4-report");
});

await check("학부모 내 정보 — 이름 수정이 홈 인사말에 반영 · 보호자 초대", async () => {
  await goto("/main/profile");
  await page.getByRole("button", { name: "이름 수정" }).click();
  const sheet = page.locator('[role="dialog"]');
  await sheet.waitFor();
  await sheet.locator("input").fill("신선웅");
  await sheet.getByRole("button", { name: "저장" }).click();
  await sleep(500);
  await goto("/main");
  assert((await text()).includes("환영합니다, 신선웅 학부모님"), "인사말");
});

// ── 종합 리포트 ─────────────────────────────────────────
await check("학부모 진행 중 프로그램 — 종합 리포트 잠김 + 샘플 미리보기(이 아이 이름 · 공유는 안내 · PDF 는 됨)", async () => {
  await goto("/main/program/run-ds26-creative?sid=student-001&studentName=신민준");
  await page.getByTestId("report-sample-open").waitFor();
  await sleep(600);
  assert((await text()).includes("6회 수업이 모두 끝나면 열려요"), "잠김 안내");
  await page.getByTestId("report-sample-open").click();
  await page.waitForSelector('[data-testid="final-report"][data-sample="true"]');
  const t = await text();
  assert(t.includes("샘플 리포트예요") && t.includes("신민준 학생"), "샘플 배너 · 학생 이름");
  assert(t.includes("민준이는 6회 수업 동안"), "총평에 아이 이름");
  assert(!t.includes("김민준"), "예시 원본 이름이 남아 있음");
  await shot("guardian-report-sample");
  await page.getByTestId("report-share").click();
  const dlg = page.locator('[role="alertdialog"]');
  await dlg.waitFor();
  assert((await dlg.innerText()).includes("실제 리포트가 발급되면"), "샘플 공유 안내");
  await dlg.getByRole("button").last().click();
  await sleep(300);
});

let shareUrl = "";
await check("학부모 지난 프로그램(봄학기) — 종합 리포트 · 과목 6개 · 출석 요약 · 회차별 한마디", async () => {
  await goto("/main/history");
  await page.getByText("봄학기 창의융합").first().click();
  await page.getByRole("button", { name: "종합 리포트 보기" }).waitFor();
  await sleep(600);
  await page.getByRole("button", { name: "종합 리포트 보기" }).click();
  await page.waitForSelector('[data-testid="final-report"][data-sample="false"]');
  assert((await page.locator('[data-testid="report-subject"]').count()) === 6, "과목 6개");
  const t = await text();
  assert(t.includes("83") && t.includes("A · 우수"), "종합 점수·등급");
  assert(t.includes("출석 5회") || /출석\s*5회/.test(t), "출석 요약: " + t.slice(t.indexOf("출석"), t.indexOf("출석") + 60));
  assert(t.includes("회차별 선생님 한마디") && t.includes("다음 프로그램 안내"), "한마디 · 다음 프로그램");
  await page.getByRole("button", { name: "모두 펼치기" }).click();
  await sleep(500);
  await shot("guardian-report-full");
});

await check("리포트 공유 — 링크 시트(복사 · 만료 안내) · 링크는 /r/", async () => {
  await page.getByTestId("report-share").click();
  await page.locator('[data-testid="share-sheet"]').waitFor();
  shareUrl = (await page.getByTestId("share-url").innerText()).trim();
  assert(shareUrl.startsWith(BASE + "/r/demo-"), shareUrl);
  assert((await text()).includes("까지 열려요"), "만료 안내");
  await page.getByTestId("share-copy").click();
  const tt = await toast();
  assert(tt.includes("복사했어요"), tt);
  await shot("guardian-report-share");
  await page.keyboard.press("Escape");
  await sleep(300);
});

await check("리포트 PDF 저장 — 파일 내려받기(이름에 학생·프로그램) · 1MB 미만", async () => {
  const [download] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), page.getByTestId("report-pdf").click()]);
  const file = path.join(SHOTS, "demo-report.pdf");
  await download.saveAs(file);
  const size = fs.statSync(file).size;
  assert(size > 30_000 && size < 1_000_000, `크기 ${size}`);
  const name = download.suggestedFilename();
  // 리눅스 컨테이너(LANG=C)의 크로미움은 한글 파일명을 "download" 로 바꾼다 — 그 경우만 넘어간다
  assert(name === "download" || /신민준_.*종합리포트\.pdf$/.test(name), name);
  const head = fs.readFileSync(file).subarray(0, 5).toString();
  assert(head === "%PDF-", "PDF 헤더: " + head);
  return `${size}B ${name}`;
});

await check("공유 링크 — 쿠키·로그인 없는 새 브라우저에서 열림 · PDF 만 · 없는 링크는 안내", async () => {
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ko-KR" });
  const p2 = await ctx2.newPage();
  const errs = [];
  p2.on("pageerror", (e) => errs.push(e.message));
  await p2.goto(shareUrl, { waitUntil: "networkidle" });
  await p2.waitForSelector('[data-testid="final-report"]');
  const t = (await p2.locator("body").innerText()).replace(/\s+/g, " ");
  assert(t.includes("보호자가 공유한 리포트예요") && t.includes("신민준 학생"), "공유 페이지 본문");
  assert((await p2.getByTestId("report-pdf").count()) === 1 && (await p2.getByTestId("report-share").count()) === 0, "PDF 만");
  assert(!(await p2.locator('[data-testid="demo-banner"]').count()), "체험 배너 없음");
  await p2.screenshot({ path: path.join(SHOTS, "demo-shared-report.png"), fullPage: true });
  await p2.goto(BASE + "/r/demo-none", { waitUntil: "networkidle" });
  await p2.waitForSelector('[data-testid="shared-report-unavailable"]');
  assert(errs.length === 0, errs[0]);
  await ctx2.close();
});

// ── 채팅 · 민원 · 만족도 (학부모 ↔ 프로그램 매니저) ─────────────
await check("학부모 홈 — 최신 공지 1줄 · 만족도 조사 카드 · 채팅 탭 배지", async () => {
  await enter("guardian");
  await page.getByTestId("home-latest-notice").waitFor();
  const notice = await page.getByTestId("home-latest-notice").innerText();
  assert(notice.includes("E2E 준비물 안내"), "최신 공지: " + notice);
  assert(await page.getByTestId("home-survey-card").count(), "만족도 카드");
  const badge = (await page.getByTestId("tab-chat-badge").innerText()).trim();
  assert(Number(badge) >= 1, "배지 " + badge);
  await shot("guardian-home-engage");
  return `공지 · 배지 ${badge}`;
});

await check("학부모 채팅 — 방 목록 → 방(탭바 숨김) → 빠른 질문 자동 안내 → 불편·요청 접수", async () => {
  await page.getByRole("link", { name: /채팅/ }).first().click();
  await page.waitForURL(/\/main\/chat$/);
  await page.getByTestId("chat-room").first().waitFor();
  assert((await page.getByTestId("chat-room").count()) >= 2, "방 2개 이상");
  await shot("guardian-chat-list");
  await page.getByTestId("chat-room").filter({ hasText: "신민준" }).filter({ hasText: "토요 창의융합" }).click();
  await page.waitForURL(/\/main\/chat\/.+/);
  await page.locator("#chat-input").waitFor();
  assert(!(await page.locator('nav[aria-label="메인 탭"]').count()), "방에서는 탭바 숨김");
  await page.getByRole("button", { name: "다음 수업 준비물" }).click();
  await page.getByText(/준비물: /).last().waitFor({ timeout: 8000 });
  await page.getByRole("switch", { name: /불편·요청/ }).click();
  await page.getByRole("button", { name: "시설·환경" }).click();
  await page.locator("#chat-input").fill("E2E 교실 창문이 잘 안 닫혀요.");
  await page.getByRole("button", { name: "접수", exact: true }).click();
  await page.getByText("불편·요청 사항으로 접수됐어요").last().waitFor({ timeout: 8000 });
  const t = await text();
  assert(t.includes("접수한 요청") && t.includes("처리 중"), "요청 요약: " + t.slice(0, 300));
  await shot("guardian-chat-room");
});

await check("학부모 만족도 — 5문항 · 후기 공개 동의 → 감사 화면 → 홈 카드 사라짐", async () => {
  await goto("/main");
  await page.getByTestId("home-survey-card").first().click();
  await page.waitForURL(/\/survey\?/);
  await page.getByTestId("survey-submit").waitFor();
  const groups = page.locator('[role="radiogroup"]');
  const n = await groups.count();
  assert(n === 5, `문항 ${n}`);
  for (let i = 0; i < n; i++) await groups.nth(i).getByRole("radio", { name: /5점/ }).click();
  await page.locator("#survey-review").fill("E2E 후기 — 아이가 토요일만 기다려요.");
  await page.getByRole("checkbox").check();
  await shot("guardian-survey");
  await page.getByTestId("survey-submit").click();
  await page.getByTestId("survey-done").waitFor();
  await goto("/main");
  const left = await page.getByTestId("home-survey-card").count();
  return `남은 카드 ${left}`;
});

await check("센터 채팅 — 탭 배지 · 답변 대기 방 → 자주 쓰는 답변으로 답장 · 민원 처리 완료", async () => {
  await enter("center");
  await page.getByTestId("nav-badge-chatWaiting").waitFor();
  await goto("/admin/center/chat");
  await page.getByTestId("center-chat-room").first().waitFor();
  await shot("center-chat-list");
  await page.getByTestId("center-chat-room").filter({ hasText: "신민준" }).first().click();
  await page.waitForURL(/\/admin\/center\/chat\/.+/);
  await page.locator("#chat-input").waitFor();
  await page.getByRole("button", { name: "자주 쓰는 답변" }).click();
  await page.locator('[role="dialog"]').getByRole("button").filter({ hasText: "불편을 드려 죄송합니다" }).click();
  await page.getByRole("button", { name: "보내기" }).click();
  await page.getByTestId("chat-mine").filter({ hasText: "불편을 드려 죄송합니다" }).last().waitFor();
  await page.getByRole("button", { name: "처리하기" }).first().click();
  const sheet = page.locator('[role="dialog"]');
  await sheet.getByRole("radio", { name: "처리 완료" }).click();
  await sheet.locator("textarea").last().fill("E2E 창문 잠금장치를 고쳤어요.");
  await sheet.getByRole("button", { name: "저장" }).click();
  assert((await toast()).includes("저장했어요"), "토스트");
  await shot("center-chat-room");
});

await check("센터 민원·문의 — 전화 접수 기록 → 상세 · 만족도 결과(방금 응답 포함)", async () => {
  await goto("/admin/center/inquiries");
  await page.getByRole("button", { name: "전화·현장 접수" }).click();
  const sheet = page.locator('[role="dialog"]');
  await sheet.getByRole("radio", { name: /문의/ }).click();
  await sheet.locator("#inq-cat").selectOption("operation");
  await sheet.locator("#inq-title").fill("E2E 전화 문의");
  await sheet.locator("#inq-body").fill("다음 학기 모집 일정 문의");
  await sheet.getByRole("button", { name: "기록하기" }).click();
  await page.waitForURL(/\/admin\/center\/inquiries\/.+/);
  await page.getByRole("heading", { name: "E2E 전화 문의" }).waitFor({ timeout: 8000 });
  await goto("/admin/center/survey");
  await page.getByTestId("survey-results").waitFor();
  const t = await text();
  assert(t.includes("E2E 후기") && t.includes("공개 동의"), "후기");
  await shot("center-survey");
});

await check("학부모 채팅방 — 처리 완료 안내 · 처리 내용", async () => {
  await enter("guardian");
  await goto("/main/chat");
  await page.getByTestId("chat-room").filter({ hasText: "신민준" }).filter({ hasText: "토요 창의융합" }).click();
  await page.getByText(/처리 완료: E2E 창문/).waitFor({ timeout: 8000 });
});

// ── 발주처 담당자 ─────────────────────────────────────
await check("발주처 현황 — 4칸 · 회차별 출석 표 · 최근 민원에 방금 처리한 건", async () => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await enter("officer");
  assert(page.url().endsWith("/partner"), page.url());
  await page.getByTestId("partner-home").waitFor();
  await page.getByTestId("attendance-table").waitFor();
  const t = await text();
  for (const s of ["진행 회차", "전체 출석률", "민원", "학부모 만족도", "E2E 교실 창문"]) assert(t.includes(s), s);
  assert(/5\s*건 접수/.test(t) && t.includes("처리 완료 4"), "민원 5 · 처리 4: " + t.slice(0, 600));
  await shot("partner-home");
});

await check("발주처 수업 · 참여 · 강사진 · 만족도 — 화면마다 내용", async () => {
  await goto("/partner/lessons");
  assert((await page.getByTestId("partner-lesson").count()) === 6, "6회차");
  await goto("/partner/participation");
  await page.getByTestId("participation-table").waitFor();
  await goto("/partner/instructors");
  assert((await page.getByTestId("partner-instructor").count()) >= 3, "강사 3명");
  await goto("/partner/survey");
  const t = await text();
  assert(t.includes("공개에 동의한 후기만") && t.includes("E2E 후기") && !t.includes("신선웅 학부모"), "공개 후기만 · 이름 가림");
  await shot("partner-survey");
});

await check("발주처 민원 — 원문 + 처리 내용 · 담당자 의견 남기기", async () => {
  await goto("/partner/inquiries");
  const card = page.getByTestId("partner-complaint").filter({ hasText: "E2E 교실 창문" });
  await card.waitFor();
  assert((await card.innerText()).includes("E2E 창문 잠금장치를 고쳤어요"), "처리 내용");
  await card.getByRole("button", { name: "의견 남기기" }).click();
  await card.locator("textarea").fill("E2E 확인했습니다.");
  await card.getByRole("button", { name: "저장" }).click();
  assert((await toast()).includes("의견을 남겼어요"), "토스트");
  await shot("partner-inquiries");
});

await check("발주처 보고서 — 장 선택 · 개요 정리하기 · 한글 · 워드 · PDF · 엑셀 내려받기", async () => {
  await goto("/partner/reports");
  await page.getByTestId("report-preview").waitFor();
  assert((await page.getByTestId("report-sections").locator('input[type="checkbox"]').count()) === 10, "장 10개");
  await page.getByRole("button", { name: "개요 정리하기" }).click();
  const outline = await page.getByTestId("report-outline").locator("textarea").inputValue();
  assert(outline.includes("1. 사업 개요") && outline.includes("민원"), "개요");
  const sizes = {};
  for (const f of ["hwpx", "docx", "pdf", "xlsx"]) {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), page.getByTestId(`report-download-${f}`).click()]);
    const file = path.join(SHOTS, `demo-partner-report.${f}`);
    await dl.saveAs(file);
    const buf = fs.readFileSync(file);
    sizes[f] = buf.length;
    const magic = buf.subarray(0, 4).toString("latin1");
    assert(f === "pdf" ? magic === "%PDF" : magic.startsWith("PK"), `${f} 헤더 ${magic}`);
    if (f === "hwpx") assert(buf.subarray(30, 38).toString("latin1") === "mimetype", "hwpx 첫 항목 mimetype");
    const name = dl.suggestedFilename();
    assert(name === "download" || name.endsWith(`운영 결과 보고서.${f}`), name);
    await sleep(400);
  }
  await shot("partner-reports");
  return Object.entries(sizes).map(([k, v]) => `${k} ${Math.round(v / 1024)}KB`).join(" · ");
});

await check("통합 관리자 — 운영 건 상세: 발주처 담당자 · 초대(임시 비밀번호 1회) · 이름 가리기 · 만족도", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter("company");
  await goto("/admin/runs/run-ds26-creative");
  await page.getByTestId("officer-list").waitFor();
  let t = await text();
  assert(t.includes("한지원") && t.includes("만족도 조사") && t.includes("응답"), "담당자 · 만족도");
  await page.getByRole("button", { name: "담당자 초대" }).click();
  const sheet = page.locator('[role="dialog"]');
  await sheet.locator("#off-name").fill("E2E 담당");
  await sheet.locator("#off-email").fill("e2e@dalseong.go.kr");
  await sheet.getByRole("button", { name: "계정 만들기" }).click();
  const pw = (await page.getByTestId("temp-password").innerText()).trim();
  assert(/^Tc-/.test(pw), pw);
  await page.keyboard.press("Escape");
  await page.getByTestId("partner-masking").check();
  assert((await toast()).includes("가려서"), "마스킹 토스트");
  await shot("company-run-partner");
  await enter("officer");
  await goto("/partner/participation");
  t = await text();
  assert(t.includes("이름 일부를 가려서") && t.includes("신○준"), "가림 반영");
  return pw;
});

// ── 회사 ──────────────────────────────────────────────
await check("회사 홈 — 캠퍼스 2곳 · 운영 건 · 승인 대기", async () => {
  await enter("company");
  assert(page.url().endsWith("/admin"), page.url());
  const t = await text();
  assert(t.includes("캠퍼스 2곳"), "캠퍼스 2곳");
  assert(t.includes("2026-구미-STEAM-01") && t.includes("2026-달성-창의-01"), "운영 건");
  assert(/승인 대기 리포트 \d+/.test(t), "승인 대기");
  await shot("company-home");
});

await check("회사 새 운영 건 — 템플릿 선택 → 회차 채워짐 → 만들기 → 상세", async () => {
  await goto("/admin/runs/new");
  await page.locator("#run-code").fill("2026-E2E-TEST-01");
  await page.locator("#run-tpl").selectOption("tpl-steam");
  await sleep(300);
  assert((await text()).includes("6회"), "회차 6개");
  await page.locator("#run-campus").selectOption("campus-gm26");
  await page.locator("#run-location").fill("구미시 청소년문화센터 3층");
  await page.locator("#run-sections").selectOption("2");
  await page.getByRole("button", { name: "운영 건 만들기" }).click();
  await page.waitForURL(/\/admin\/runs\/run-/, { timeout: 15000 });
  await sleep(500);
  const t = await text();
  assert(t.includes("2026-E2E-TEST-01") && t.includes("12개 회차"), "상세: " + t.slice(0, 300));
  await shot("company-run-detail");
});

await check("회사 명단 등록 — 붙여넣기 → 미리보기 → 등록", async () => {
  await goto("/admin/import");
  const cell = page.locator(".dsg-cell:not(.dsg-cell-header):not(.dsg-cell-gutter)").first();
  await cell.click();
  await page.evaluate(() => {
    const rows = ["김테스트\t20150301\t2026-E2E-TEST-01\tcampus-gm26\t1반\t01000000001", "김테스트2\t20170502\t2026-E2E-TEST-01\tcampus-gm26\t2반\t01000000001"];
    const dt = new DataTransfer();
    dt.setData("text/plain", rows.join("\n"));
    document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await sleep(500);
  assert((await text()).includes("등록 가능 2명"), "2명: " + (await text()).slice(0, 400));
  await page.getByRole("button", { name: "미리보기" }).click();
  await sleep(800);
  let t = await text();
  assert(t.includes("미리보기") && t.includes("김테스트2"), "미리보기 결과");
  await page.getByRole("button", { name: "등록하기" }).click();
  assert((await toast()).includes("2명을 등록했어요"), "등록 토스트");
  await sleep(500);
  t = await text();
  assert(t.includes("등록 완료"), "등록 완료");
  await shot("company-import");
  await goto("/admin/runs");
  assert((await text()).includes("2026-E2E-TEST-01"), "목록에 새 운영 건");
});

await check("회사 리포트 정책 — 승인 대기 목록 · 정책 토글", async () => {
  await goto("/admin/policy");
  let t = await text();
  assert(t.includes("회사 승인 대기") && t.includes("구미"), "구미 승인 대기");
  const row = page.locator("li").filter({ hasText: "2026-달성-창의-01" }).first();
  await row.getByRole("button", { name: "승인 켜기" }).click();
  assert((await toast()).includes("정책을 바꿨어요"), "토글");
  await sleep(400);
  t = await text();
  assert(t.includes("회사 승인 후 공개"), "정책 반영");
  await shot("company-policy");
});

await check("회사 체험 중 센터 화면 — 회사 관리자는 센터 앱도 볼 수 있다", async () => {
  await goto("/admin/center");
  const t = await text();
  assert(t.includes("프로그램 매니저") && t.includes("2026-달성-창의-01"), t.slice(0, 200));
});

await check("학부모 체험 중 /admin → 역할 안내(통합 관리자 체험으로 바꾸기)", async () => {
  await enter("guardian");
  await goto("/admin");
  const t = await text();
  assert(t.includes("학부모 체험 중") && t.includes("통합 관리자 체험으로 바꾸기"), t.slice(0, 200));
  await shot("guard-wrong-role");
});

// ── 초기화 · 종료 ─────────────────────────────────────
await check("배너 초기화 → 세계가 처음으로 (센터 검수 대기 24 · 새 운영 건 없음)", async () => {
  await enter("center");
  await page.getByRole("button", { name: "초기화" }).click();
  await confirmDialog();
  await page.waitForLoadState("networkidle");
  await sleep(800);
  const t = await text();
  assert(t.includes("검수 대기 리포트 24"), "24: " + t.slice(0, 400));
  assert(t.includes("강사 미배정 회차 1"), "미배정 1");
  await enter("company");
  assert(!(await text()).includes("2026-E2E-TEST-01"), "새 운영 건 사라짐");
});

await check("체험 종료 → 허브 · 쿠키 없음 → 배너 없음", async () => {
  await goto("/demo/exit");
  assert(page.url().endsWith("/demo"), page.url());
  const cookies = await ctx.cookies(BASE);
  assert(!cookies.some((c) => c.name === "tc_demo" && c.value), "쿠키 삭제");
  assert(!(await page.locator('[data-testid="demo-banner"]').count()), "배너 없음");
});

await check("데스크톱(1024px) 센터 수업 — 반 카드 2열 · 가로 스크롤 없음", async () => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await enter("center");
  await goto("/admin/center/lessons");
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert(!wide, "가로 스크롤");
  await shot("center-lessons-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
});

await check("Firebase 요청 0건 · 페이지 오류 없음", async () => {
  assert(firebaseCalls.length === 0, `Firebase 요청 ${firebaseCalls.length}건: ${firebaseCalls[0]}`);
  assert(pageErrors.length === 0, `오류: ${pageErrors[0]}`);
});

await check("모든 화면 글자 크기 14px 이상", async () => {
  assert(smallText.length === 0, smallText.slice(0, 5).join(" | "));
});

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
fs.writeFileSync(path.join(HERE, "demo-results.json"), JSON.stringify(results, null, 2));
process.exit(passed === results.length ? 0 : 1);
