/**
 * ThinkCampus 웹 E2E — 실제 Cloud Functions + Firebase 에뮬레이터(auth/firestore/functions) 대상
 *
 * 사용법은 web/e2e/README.md 참고. 요약:
 *   1) 루트에서  firebase emulators:start --only auth,firestore,functions --project demo-thinkcampus
 *   2) 시드      cd scripts && FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-thinkcampus npx ts-node seed.ts --clean
 *   3) 웹 빌드   cd web && npm run build:emu && npm run start:emu      (포트 3100)
 *   4) 실행      cd web && npm run e2e
 *
 * 스크린샷: web/e2e/shots/*.png, 결과: web/e2e/results.json
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const PROJECT = process.env.E2E_PROJECT_ID ?? "demo-thinkcampus";
const AUTH_EMU = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT}`;
const SHOTS = path.join(HERE, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];
function pass(name, detail = "") { results.push({ ok: true, name, detail }); console.log(`PASS  ${name} ${detail}`); }
function fail(name, detail = "") { results.push({ ok: false, name, detail }); console.log(`FAIL  ${name} ${detail}`); }
async function check(name, fn) {
  try { const d = await fn(); pass(name, d ?? ""); }
  catch (e) { fail(name, String(e?.message ?? e).split("\n")[0]); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function latestCode(phoneE164) {
  const res = await fetch(`${AUTH_EMU}/verificationCodes`);
  const json = await res.json();
  const list = (json.verificationCodes ?? []).filter((v) => v.phoneNumber === phoneE164);
  if (!list.length) throw new Error("no verification code for " + phoneE164);
  return list[list.length - 1].code;
}

// 에뮬레이터 관리자 조회 (Bearer owner = 보안 규칙 우회)
const OWNER = { Authorization: "Bearer owner", "Content-Type": "application/json" };
async function emuAccounts() {
  const res = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, {
    method: "POST", headers: OWNER, body: "{}",
  });
  return (await res.json()).userInfo ?? [];
}
const FS_EMU = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;
async function emuDocs(collection) {
  const res = await fetch(`${FS_EMU}/${collection}?pageSize=300`, { headers: OWNER });
  return (await res.json()).documents ?? [];
}
async function emuDoc(docPath) {
  const res = await fetch(`${FS_EMU}/${docPath}`, { headers: OWNER });
  return res.json();
}
const strArray = (field) => (field?.arrayValue?.values ?? []).map((v) => v.stringValue);

async function dialogText(page) {
  const dlg = page.locator('[role="alertdialog"]');
  await dlg.waitFor({ timeout: 15000 });
  return (await dlg.innerText()).replace(/\s+/g, " ").trim();
}
async function pressDialog(page, label) {
  await page.locator('[role="alertdialog"] button', { hasText: label }).click();
  await page.locator('[role="alertdialog"]').waitFor({ state: "detached" });
}

const browser = await chromium.launch({
  executablePath: process.env.E2E_CHROMIUM_PATH || undefined,
  headless: process.env.E2E_HEADED !== "1",
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "ko-KR",
});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
// macOS/Windows Chrome 은 Web Share API 가 있어 공유 시트가 떠버림 → 클립보드 폴백 경로를 결정적으로 검증
await ctx.addInitScript(() => {
  try { Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }); } catch {}
});
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`[${page.url()}] ${m.text()}`); });
page.on("pageerror", (e) => consoleErrors.push(`[pageerror ${page.url()}] ${e.message}`));

// 학부모용: 화면에 보이는 모든 글자는 14px 이상이어야 한다
const MIN_FONT_PX = 14;
const fontViolations = new Map(); // "12px 텍스트" → 화면 이름
async function checkFontSizes(p, name) {
  const bad = await p.evaluate((min) => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = (node.textContent || "").trim();
      const el = node.parentElement;
      if (!text || !el || el.closest("script,style,noscript,#tc-recaptcha-container")) continue;
      if (el.closest('.collapse-anim[data-open="false"]')) continue; // 접힌 영역
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const size = parseFloat(cs.fontSize);
      if (size < min) out.push(`${size}px "${text.slice(0, 24)}"`);
    }
    return out;
  }, MIN_FONT_PX);
  for (const b of bad) if (!fontViolations.has(b)) fontViolations.set(b, name);
}
const shot = async (name, opts = {}) => {
  await checkFontSizes(page, name);
  return page.screenshot({ path: `${SHOTS}/${name}.png`, ...opts });
};

// ── 1. 진입 → 온보딩 ─────────────────────────────────────
await check("루트(/) 미인증 → /onboarding 리다이렉트", async () => {
  await page.goto(BASE + "/");
  await page.waitForURL("**/onboarding", { timeout: 20000 });
  await page.getByText("ThinkCampus").first().waitFor();
});
await shot("01-onboarding");

async function submitCode(code) {
  const input = page.locator("#code");
  await input.fill("");
  await input.fill(code);
  await page.getByRole("button", { name: "다음" }).click();
}

await check("등록코드 자동 포맷 (dS26a3f7k → DS26-A3F7K)", async () => {
  await page.locator("#code").fill("dS26a3f7k");
  const v = await page.locator("#code").inputValue();
  if (v !== "DS26-A3F7K") throw new Error("got " + v);
  await page.getByText("✓ 코드 확인 완료").waitFor();
});

await check("존재하지 않는 코드 → not-found 안내", async () => {
  await submitCode("XXXX00001");
  const t = await dialogText(page);
  if (!t.includes("존재하지 않는 등록코드입니다")) throw new Error(t);
  await shot("02-code-notfound");
  await pressDialog(page, "확인");
});
await check("사용된 코드 → already-exists 안내", async () => {
  await submitCode("DS26B8M2Q");
  const t = await dialogText(page);
  if (!t.includes("이미 사용된 등록코드입니다")) throw new Error(t);
  await pressDialog(page, "확인");
});
await check("만료 코드 → deadline-exceeded 안내", async () => {
  await submitCode("DS26C4N9P");
  const t = await dialogText(page);
  if (!t.includes("만료된 등록코드입니다")) throw new Error(t);
  await pressDialog(page, "확인");
});

await check("정상 코드 → Step2(캠퍼스/마스킹 이름 미리보기)", async () => {
  await submitCode("DS26A3F7K");
  await page.waitForURL("**/onboarding/verify**", { timeout: 20000 });
  await page.getByText("달성캠퍼스").waitFor();
  await page.getByText("김○○").waitFor();
});
await shot("03-verify");

await check("생년월일 불일치 → unauthenticated (시도 횟수 표시)", async () => {
  await page.locator("#birth").fill("19990101");
  await page.getByRole("button", { name: "모(엄마)" }).click();
  await page.locator("#phone").fill("01011112222");
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  const t = await dialogText(page);
  if (!t.includes("생년월일")) throw new Error(t);
  if (/\[\d+\]/.test(t)) throw new Error("HTTP 상태 코드가 사용자 메시지에 노출됨: " + t);
  await pressDialog(page, "확인");
  return `"${t.slice(0, 60)}"`;
});

await check("생년월일 입력 포맷 (20100315 → 2010.03.15)", async () => {
  await page.locator("#birth").fill("20100315");
  const v = await page.locator("#birth").inputValue();
  if (v !== "2010.03.15") throw new Error(v);
});

await check("redeemCode 성공 → Step3 OTP (전화번호 URL 비노출)", async () => {
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.waitForURL("**/onboarding/otp", { timeout: 20000 });
  if (page.url().includes("010")) throw new Error("phone leaked in URL: " + page.url());
  await page.getByText("010-****-2222").waitFor();
  await page.getByLabel("6자리 인증번호").waitFor({ timeout: 20000 });
});
await shot("04-otp");

await check("SMS OTP(에뮬레이터) 입력 → 커스텀토큰 로그인 → /main", async () => {
  await sleep(500);
  const code = await latestCode("+821011112222");
  await page.getByLabel("6자리 인증번호").fill(code);
  await page.getByRole("button", { name: "인증 완료" }).click();
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  await page.getByText("김민준 학부모님!").waitFor({ timeout: 20000 });
  if (await page.getByRole("button", { name: /자녀 전환/ }).count()) throw new Error("자녀 1명인데 전환 버튼이 보임");
  return `code=${code}`;
});
await sleep(400);
await shot("05-home");
await shot("05-home-full", { fullPage: true });

// ── 2. 프로그램 상세: 회차 목록 → 회차 화면(출결 · 일정 · 내용 · Q&A · 리포트) ──
const sessionRow = (n) => page.getByRole("button", { name: new RegExp(`^${n}회차 `) });
const tab = (name) => page.getByRole("tab", { name, exact: true });
const panel = () => page.getByRole("tabpanel");
async function expectSelected(name) {
  const v = await tab(name).getAttribute("aria-selected");
  if (v !== "true") throw new Error(`${name} 탭이 선택되지 않음`);
}

await check("홈 카드(간소화) → 프로그램 회차 목록", async () => {
  const card = page.getByRole("button", { name: /상세 보기$/ });
  const text = await card.innerText();
  for (const gone of ["김민준 학생", "총 18차시", "초등 특기적성", "강남구 청소년수련관"]) {
    if (text.includes(gone)) throw new Error(`홈 카드에 아직 "${gone}" 표시됨`);
  }
  if (!text.includes("다음 수업") || !text.includes("3/6회")) throw new Error("카드 핵심 정보 누락: " + text);
  await card.click();
  await page.waitForURL(/\/main\/program\/prog-001\?.*sid=student-001/, { timeout: 20000 });
  await page.getByText("김민준 학생").first().waitFor();
  if (await page.getByRole("grid").count()) throw new Error("달력이 남아 있음");
  if (await page.getByRole("region", { name: "다음 수업" }).count()) throw new Error("예전 수업 일지 카드가 남아 있음");
});

await check("회차 목록: 진행 3/6 · 6개 회차(출결 상태) · 4회차 다음 수업 강조 · 종합 리포트는 종료 후", async () => {
  await page.getByRole("heading", { name: "회차별 수업" }).waitFor();
  await page.getByText("진행 3").waitFor();
  const rows = page.getByRole("button", { name: /^\d+회차 / });
  if ((await rows.count()) !== 6) throw new Error("회차 수 " + (await rows.count()));
  const expect = { 1: "출석", 2: "출석", 3: "지각", 4: "다음 수업", 5: "예정", 6: "예정" };
  for (const [n, s] of Object.entries(expect)) {
    const label = await sessionRow(n).getAttribute("aria-label");
    if (!label?.endsWith(s)) throw new Error(`${n}회차 상태: ${label}`);
  }
  await sessionRow(4).getByText("10월 17일 (토)").waitFor();
  await page.getByText("6회 수업이 모두 끝나면 발급돼요", { exact: false }).waitFor();
  if (await page.getByRole("button", { name: /종합 리포트 보기/ }).count()) throw new Error("진행 중인데 종합 리포트 버튼");
});
await sleep(300);
await shot("06-program-sessions");
await shot("06-program-sessions-full", { fullPage: true });

await check("3회차(지각) → 출결 탭: 입실 10:18 · 18분 늦음 · 탭 5개(리포트 포함)", async () => {
  await sessionRow(3).click();
  await page.waitForURL(/\/session\/sess-03\?/, { timeout: 15000 });
  await page.getByRole("heading", { level: 1, name: "한국사 인문학 — 우리 역사 깊이 읽기" }).waitFor();
  const names = await page.getByRole("tab").allInnerTexts();
  if (names.join(",") !== "출결,일정,내용,Q&A,리포트") throw new Error("탭: " + names.join(","));
  await expectSelected("출결");
  await panel().getByRole("heading", { name: "출결", exact: true }).waitFor();
  await panel().getByText("10:18 입실 · 18분 늦음").waitFor();
  await panel().getByText("이 프로그램 출결").waitFor();
});
await sleep(300);
await shot("07-session-attendance");

await check("일정 탭 → 날짜·시간·장소·준비물·진행 순서 (?tab=schedule)", async () => {
  await tab("일정").click();
  await page.waitForURL(/\/session\/sess-03\?.*tab=schedule/, { timeout: 15000 });
  await expectSelected("일정");
  await panel().getByRole("heading", { name: "프로그램 일정" }).waitFor();
  for (const h of ["수업 일정", "준비물", "진행 순서"]) await panel().getByRole("heading", { name: h }).waitFor();
  await panel().getByText("120분 · 3차시").waitFor();
  await panel().getByText("강남구 청소년수련관 3층 301호").waitFor();
});
await sleep(200);
await shot("07b-session-schedule", { fullPage: true });

await check("내용 탭 → 수업 소개 · 강사 소개", async () => {
  await tab("내용").click();
  await page.waitForURL(/tab=content/, { timeout: 15000 });
  await panel().getByRole("heading", { name: "프로그램 내용" }).waitFor();
  for (const h of ["수업 소개", "강사 소개"]) await panel().getByRole("heading", { name: h }).waitFor();
});
await sleep(200);
await shot("07c-session-content", { fullPage: true });

await check("Q&A 탭 → 질문 누르면 답 펼침 · 챗봇/전화 문의", async () => {
  await tab("Q&A").click();
  await page.waitForURL(/tab=qna/, { timeout: 15000 });
  await panel().getByRole("heading", { name: "프로그램 Q&A" }).waitFor();
  const q = panel().getByRole("button", { expanded: false }).first();
  const qText = await q.innerText();
  await q.click();
  const opened = panel().getByRole("button", { name: qText.replace(/\s*⌄\s*$/, "").replace(/^Q\s*/, ""), exact: false });
  if ((await opened.first().getAttribute("aria-expanded")) !== "true") throw new Error("질문이 펼쳐지지 않음");
  await panel().getByRole("link", { name: /챗봇에게 묻기/ }).waitFor();
  const tel = await panel().getByRole("link", { name: /전화 문의/ }).getAttribute("href");
  if (tel !== "tel:01067117933") throw new Error("tel=" + tel);
});
await sleep(400);
await shot("07d-session-qna", { fullPage: true });

await check("리포트 탭 → 선생님 한마디 · 수업 참여 · 이 수업 평가", async () => {
  await tab("리포트").click();
  await page.waitForURL(/tab=report/, { timeout: 15000 });
  await panel().getByRole("heading", { name: "3회차 리포트" }).waitFor();
  for (const h of ["선생님 한마디", "수업 참여", "잘한 점", "이 수업 평가"]) {
    await panel().getByRole("heading", { name: h }).waitFor();
  }
  if (await page.getByRole("button", { name: /종합 리포트 보기/ }).count()) throw new Error("진행 중인데 종합 리포트 버튼");
});
await sleep(200);
await shot("07e-session-report", { fullPage: true });

await check("새로고침해도 탭 유지 (?tab=report)", async () => {
  await page.reload();
  await tab("리포트").waitFor({ timeout: 20000 });
  await expectSelected("리포트");
});

await check("다음 회차 › → 4회차(예정): 리포트 탭 없음 · 일정 탭부터 · 출결은 '수업 전'", async () => {
  await page.getByRole("button", { name: /다음 회차/ }).click();
  await page.waitForURL(/\/session\/sess-04\?/, { timeout: 15000 });
  if (page.url().includes("tab=")) throw new Error("없는 탭이 주소에 남음: " + page.url());
  await page.getByRole("heading", { level: 1, name: "사고·창의력 디베이트" }).waitFor();
  if ((await page.getByRole("tab").count()) !== 4) throw new Error("예정 회차 탭 수");
  await expectSelected("일정");
  await panel().getByText("필기도구").waitFor();
  await panel().getByText("포스트잇").waitFor();
  await shot("08-session-upcoming");
  await tab("출결").click();
  await panel().getByText("수업 전").waitFor();
  await panel().getByText("수업 당일 입실하면 기록돼요").waitFor();
});
await sleep(200);
await shot("08b-session-upcoming-attendance");

await check("이전/다음 회차 이동 시 보던 탭 유지 → ← 회차 목록 한 번에 복귀", async () => {
  await page.getByRole("button", { name: /이전 회차/ }).click();
  await page.waitForURL(/\/session\/sess-03\?.*tab=attendance/, { timeout: 15000 });
  await panel().getByText("18분 늦음", { exact: false }).waitFor();
  await page.getByRole("button", { name: /다음 회차/ }).click();
  await page.waitForURL(/\/session\/sess-04\?.*tab=attendance/, { timeout: 15000 });
  await page.getByRole("button", { name: "← 회차 목록" }).click();
  await page.waitForURL(/\/main\/program\/prog-001\?/, { timeout: 15000 });
  await page.getByRole("heading", { name: "회차별 수업" }).waitFor();
});

await check("Q&A [챗봇에게 묻기] → 챗봇 탭 → ← 회차로 → ← 회차 목록 → ← 홈", async () => {
  await sessionRow(4).click();
  await page.waitForURL(/\/session\/sess-04\?/, { timeout: 15000 });
  await tab("Q&A").click();
  await page.waitForURL(/tab=qna/, { timeout: 15000 });
  await panel().getByRole("link", { name: /챗봇에게 묻기/ }).click();
  await page.waitForURL(/\/main\/faq\?tab=chatbot/, { timeout: 15000 });
  if ((await page.getByRole("tab", { name: /챗봇/ }).getAttribute("aria-selected")) !== "true") throw new Error("챗봇 탭 아님");
  await page.getByText("무엇을 도와드릴까요?").waitFor();
  await page.getByRole("button", { name: "← 회차로" }).click();
  await page.waitForURL(/\/session\/sess-04\?.*tab=qna/, { timeout: 15000 });
  await page.getByRole("button", { name: "← 회차 목록" }).click();
  await page.waitForURL(/\/main\/program\/prog-001\?/, { timeout: 15000 });
  await page.getByRole("button", { name: "← 홈" }).click();
  await page.waitForURL(/\/main$/, { timeout: 15000 });
});

await check("홈에 샘플 리포트 카드 없음 · 종합 리포트(주소로 바로 열기) → 공유 → 클립보드/토스트 폴백", async () => {
  await page.getByText("현재 수강 중인 프로그램").waitFor({ timeout: 20000 });
  if (await page.getByText("학습 리포트 미리보기").count()) throw new Error("홈에 샘플 리포트 카드가 남아 있음");
  const qs = new URLSearchParams({ studentName: "김민준", programTitle: "2026 ThinkCampus 토요 창의융합", sid: "student-001" });
  await page.goto(`${BASE}/main/program/prog-001/report?${qs}`);
  await page.getByRole("heading", { name: "종합 학습 리포트" }).waitFor({ timeout: 20000 });
  await sleep(300);
  await shot("09-program-report");
  await page.getByRole("button", { name: /리포트 공유하기/ }).click();
  // headless chromium: navigator.share 없음 → 클립보드 복사 → 토스트
  const toast = page.getByRole("status").filter({ hasText: "링크가 복사되었습니다" });
  await toast.waitFor({ timeout: 15000 });
  await shot("09b-toast");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  await toast.waitFor({ state: "detached", timeout: 5000 });
  if (!clip.includes("thinkcampus")) throw new Error("clipboard=" + clip);
  return `clipboard="${clip.slice(0, 60)}…"`;
});

await check("← 뒤로(바로 연 주소라 기록 없음) → 회차 목록 → ← 홈", async () => {
  await page.getByRole("button", { name: "← 뒤로" }).click();
  await page.waitForURL(/\/main\/program\/prog-001\?/, { timeout: 15000 });
  await page.getByRole("heading", { name: "회차별 수업" }).waitFor();
  await page.getByRole("button", { name: "← 홈" }).click();
  await page.waitForURL(/\/main$/, { timeout: 15000 });
});

await check("예전 주소 리디렉션: /attendance → 회차 목록, /main/program/session/sess-02 → 회차 내용 탭", async () => {
  await page.goto(BASE + "/main/program/prog-001/attendance?studentName=%EA%B9%80%EB%AF%BC%EC%A4%80");
  await page.waitForURL(/\/main\/program\/prog-001\?studentName=/, { timeout: 20000 });
  await page.getByRole("heading", { name: "회차별 수업" }).waitFor();
  await page.goto(BASE + "/main/program/session/sess-02");
  await page.waitForURL(/\/main\/program\/prog-001\/session\/sess-02\?tab=content$/, { timeout: 20000 });
  await panel().getByRole("heading", { name: "프로그램 내용" }).waitFor();
  await panel().getByRole("heading", { name: "수업 자료" }).waitFor();
  await panel().getByRole("button", { name: /수업 PPT/ }).first().waitFor();
  await sleep(200);
  await shot("08c-session-content-materials", { fullPage: true });
  await page.goto(BASE + "/main");
  await page.getByText("김민준 학부모님!").waitFor({ timeout: 20000 });
});

await check("알림 탭 + 모두 읽음 처리", async () => {
  await page.getByRole("link", { name: /알림/ }).click();
  await page.waitForURL(/\/main\/notification$/);
  await page.getByText("출결 업데이트").waitFor();
  await shot("10-notification");
  await page.getByRole("button", { name: "모두 읽음 처리" }).click();
  await page.getByRole("button", { name: "모두 읽음 처리" }).waitFor({ state: "detached" });
});

await check("내 정보: 전화번호/자녀 표시", async () => {
  await page.getByRole("link", { name: /내 정보/ }).click();
  await page.waitForURL(/\/main\/profile$/);
  await page.getByText("010-1111-2222").waitFor({ timeout: 15000 });
  await page.getByText("김민준").first().waitFor({ timeout: 15000 });
});
await sleep(300);
await shot("11-profile");

await check("보호자 초대 시트 → addGuardianPhone 성공", async () => {
  await page.getByRole("button", { name: /보호자 초대/ }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.waitFor();
  await sleep(400);
  await shot("12-invite-sheet");
  await sheet.locator("#invite-phone").fill("01033334444");
  await sheet.getByRole("button", { name: "부(아빠)" }).click();
  await sheet.getByRole("button", { name: /초대하기|초대 보내기|추가/ }).last().click();
  const t = await dialogText(page);
  if (!t.includes("초대 완료")) throw new Error(t);
  await pressDialog(page, "확인");
  await sheet.waitFor({ state: "detached" });
});

// ── 4. 기타 화면 ────────────────────────────────────────
for (const [name, path, text] of [
  ["13-faq", "/main/faq", "자주 묻는 질문"],
  ["15-report", "/main/report", "학습 리포트"],
  ["16-attendance", "/main/attendance", "출결"],
  ["17-report-detail", "/main/report_detail/report-2026-001", "PDF 저장·공유"],
  ["18-program-list", "/main/program", "회차별 일정"],
]) {
  await check(`화면 렌더: ${path}`, async () => {
    await page.goto(BASE + path);
    await page.getByText(text).first().waitFor({ timeout: 20000 });
    await sleep(300);
    await shot(name);
  });
}

await check("FAQ 챗봇: 선택지 → 답변", async () => {
  await page.goto(BASE + "/main/faq");
  await page.getByRole("tab", { name: /챗봇/ }).or(page.getByRole("button", { name: /챗봇/ })).first().click();
  await page.getByText("무엇을 도와드릴까요?").waitFor();
  const opts = page.locator("button", { hasNotText: /챗봇|자주 묻는|홈|전송/ });
  const before = await page.locator("body").innerText();
  await page.getByRole("button").filter({ hasText: /출결|수업|리포트|등록/ }).first().click();
  await sleep(1800);
  const after = await page.locator("body").innerText();
  if (after.length <= before.length) throw new Error("no new bot message");
  await shot("14-faq-chatbot");
  void opts;
});

await check("딥링크 새로고침: 세션 유지 + ← 회차 목록 폴백", async () => {
  await page.goto(BASE + "/main/program/prog-001/session/sess-02?tab=content");
  await page.getByRole("heading", { name: "프로그램 내용" }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: "← 회차 목록" }).click();
  await page.waitForURL(/\/main\/program\/prog-001$/, { timeout: 15000 });
  await page.getByRole("heading", { name: "회차별 수업" }).waitFor();
});

await check("리포트 상세: 인쇄 버튼 → 인쇄 iframe 생성", async () => {
  await page.goto(BASE + "/main/report_detail/report-2026-001");
  await page.getByRole("button", { name: "인쇄" }).waitFor();
  await page.evaluate(() => { window.__printed = 0; HTMLIFrameElement.prototype.__x = 1; });
  // iframe 의 print 호출을 가로채 확인
  await page.evaluate(() => {
    const orig = document.createElement.bind(document);
    document.createElement = (tag, o) => {
      const el = orig(tag, o);
      if (String(tag).toLowerCase() === "iframe") {
        setTimeout(() => { try { el.contentWindow.print = () => { window.__printed++; }; } catch {} }, 0);
      }
      return el;
    };
  });
  await page.getByRole("button", { name: "인쇄" }).click();
  await sleep(800);
  const n = await page.evaluate(() => window.__printed);
  if (n < 1) throw new Error("print not called");
});

// ── 5. 로그아웃 / 가드 / 재로그인 ────────────────────────
await check("로그아웃 → /onboarding (가드 경합 없음)", async () => {
  await page.goto(BASE + "/main/profile");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await dialogText(page);
  await pressDialog(page, "로그아웃");
  await page.waitForURL(/\/onboarding$/, { timeout: 15000 });
  await sleep(1500);
  if (!/\/onboarding$/.test(page.url())) throw new Error("moved to " + page.url());
});

await check("미인증 딥링크 → /onboarding/login?next=…", async () => {
  await page.goto(BASE + "/main/report");
  await page.waitForURL(/\/onboarding\/login\?next=%2Fmain%2Freport/, { timeout: 20000 });
});
await shot("19-login");

await check("기존 학부모 로그인 → next 경로(/main/report) 복귀", async () => {
  await page.locator("#phone").fill("01011112222");
  const v = await page.locator("#phone").inputValue();
  if (v !== "010-1111-2222") throw new Error("format " + v);
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.getByLabel("6자리 인증번호").waitFor({ timeout: 20000 });
  await shot("20-login-otp");
  await sleep(300);
  const code = await latestCode("+821011112222");
  await page.getByLabel("6자리 인증번호").fill(code);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/main\/report$/, { timeout: 20000 });
});

await check("기존 계정에 두 번째 자녀 연결 → 홈 오른쪽 위 자녀 전환 버튼 표시", async () => {
  await page.goto(BASE + "/onboarding");
  await submitCode("DS26ABC12");
  await page.waitForURL("**/onboarding/verify**", { timeout: 20000 });
  await page.getByText("최○○").waitFor();
  await page.locator("#birth").fill("20120301");
  await page.getByRole("button", { name: "부(아빠)" }).click();
  await page.locator("#phone").fill("01011112222");
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  const t = await dialogText(page);
  if (!t.includes("기존 계정에 자녀가 연결되었습니다")) throw new Error(t);
  await pressDialog(page, "확인");
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  const sw = page.getByRole("button", { name: /자녀 전환/ });
  await sw.waitFor({ timeout: 20000 });
  // 이름순 정렬 → 기본 선택은 김민준
  await page.getByText("김민준 학부모님!").waitFor();
  await page.getByText("연결된 자녀 2명").first().waitFor();
  const box = await sw.boundingBox();
  if (!box || box.x < 390 / 2) throw new Error("전환 버튼이 오른쪽 위에 있지 않음 x=" + box?.x);
  await sleep(300);
  await shot("23-home-two-children");
});

await check("자녀 전환 시트 → 최민철 선택 → 인사말·프로그램 카드 변경", async () => {
  await page.getByRole("button", { name: /자녀 전환/ }).click();
  const sheet = page.getByRole("dialog", { name: "자녀 선택" });
  await sheet.waitFor();
  const opts = sheet.getByRole("option");
  if ((await opts.count()) !== 2) throw new Error("옵션 수 " + (await opts.count()));
  if ((await opts.nth(0).getAttribute("aria-selected")) !== "true") throw new Error("현재 자녀 체크 표시 없음");
  await sleep(300);
  await shot("24-child-switch-sheet");
  await sheet.getByRole("option", { name: /최민철/ }).click();
  await sheet.waitFor({ state: "detached" });
  await page.getByText("최민철 학부모님!").waitFor();
  await page.getByText("최민철 학생").first().waitFor();
  if (await page.getByText("김민준 학생").count()) throw new Error("이전 자녀 카드가 남아 있음");
  await sleep(300);
  await shot("25-home-switched");
});

await check("새로고침 후에도 선택 유지 → 회차 목록·회차 화면에 선택 자녀 출결", async () => {
  await page.reload();
  await page.getByText("최민철 학부모님!").waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /상세 보기$/ }).click();
  await page.waitForURL(/\/main\/program\/prog-001\?.*sid=student-004/, { timeout: 20000 });
  await page.getByText("최민철 학생").first().waitFor();
  // 학생별 출결: 최민철(더미 B)은 2회차(9/19) 결석
  const label = await sessionRow(2).getAttribute("aria-label");
  if (!label?.endsWith("결석")) throw new Error("2회차 결석 표시 없음: " + label);
  await sessionRow(2).click();
  await page.waitForURL(/\/session\/sess-02\?.*sid=student-004/, { timeout: 15000 });
  await page.getByText("최민철 학생", { exact: false }).first().waitFor();
  await panel().getByText("이 날은 수업에 참여하지 않았어요").waitFor();
  await tab("리포트").click();
  await panel().getByText("결석한 회차라 참여도와 평가가 없어요.").waitFor();
  if (await panel().getByRole("heading", { name: "이 수업 평가" }).count()) throw new Error("결석 회차에 평가 표시");
  await sleep(200);
  await shot("26-child2-absent-report");
  await page.getByRole("button", { name: "← 회차 목록" }).click();
  await page.waitForURL(/\/main\/program\/prog-001\?/, { timeout: 15000 });
  await page.getByRole("button", { name: "← 홈" }).click();
  await page.waitForURL(/\/main$/);
  await page.getByText("최민철 학부모님!").waitFor({ timeout: 20000 });
  // 원래대로
  await page.getByRole("button", { name: /자녀 전환/ }).click();
  await page.getByRole("option", { name: /김민준/ }).click();
  await page.getByText("김민준 학부모님!").waitFor();
});

await check("잘못된 OTP → 인증 실패 안내", async () => {
  await page.goto(BASE + "/main/profile");
  await page.getByRole("button", { name: "로그아웃" }).click();
  await pressDialog(page, "로그아웃");
  await page.waitForURL(/\/onboarding$/);
  await page.goto(BASE + "/onboarding/login");
  await page.locator("#phone").fill("01011112222");
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.getByLabel("6자리 인증번호").fill("000000");
  await page.getByRole("button", { name: "로그인" }).click();
  const t = await dialogText(page);
  if (!t.includes("인증 실패")) throw new Error(t);
  await pressDialog(page, "확인");
  return `"${t.slice(0, 50)}"`;
});

await check("등록되지 않은 번호 로그인 → '등록된 자녀가 없습니다' → 온보딩", async () => {
  await page.getByRole("button", { name: "← 이전" }).click(); // otp → phone
  await page.locator("#phone").fill("01099998888");
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.getByLabel("6자리 인증번호").waitFor({ timeout: 20000 });
  await sleep(300);
  const code = await latestCode("+821099998888");
  await page.getByLabel("6자리 인증번호").fill(code);
  await page.getByRole("button", { name: "로그인" }).click();
  const t = await dialogText(page);
  if (!t.includes("등록된 자녀가 없습니다")) throw new Error(t);
  await pressDialog(page, "등록코드 입력");
  await page.waitForURL(/\/onboarding$/, { timeout: 15000 });
});

await check("초대받은 보호자(01033334444) 로그인 → 자동 연결 → 홈", async () => {
  await page.goto(BASE + "/onboarding/login");
  await page.locator("#phone").fill("01033334444");
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.getByLabel("6자리 인증번호").waitFor({ timeout: 20000 });
  await sleep(300);
  const code = await latestCode("+821033334444");
  await page.getByLabel("6자리 인증번호").fill(code);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  await page.getByText("김민준 학부모님!").waitFor({ timeout: 20000 });
  await shot("22-invited-guardian-home");
});

// ── 5b. 회원 탈퇴 (초대받은 보호자 계정으로) ─────────────────
let withdrawnUid = null;
await check("회원 탈퇴: 내 정보 → 안내(자녀·번호) → 확인 체크 전 비활성 → 취소/탈퇴 → /goodbye", async () => {
  const me = (await emuAccounts()).find((u) => u.phoneNumber === "+821033334444");
  if (!me) throw new Error("초대받은 보호자 계정 없음");
  withdrawnUid = me.localId;
  await page.getByRole("link", { name: /내 정보/ }).click();
  await page.waitForURL(/\/main\/profile$/);
  await page.getByRole("link", { name: "회원 탈퇴" }).click();
  await page.waitForURL(/\/main\/profile\/withdraw$/, { timeout: 15000 });
  await page.getByRole("heading", { name: "탈퇴하면 이렇게 돼요" }).waitFor();
  await page.getByText("김민준", { exact: true }).waitFor({ timeout: 15000 });
  await page.getByText("010-3333-4444").waitFor();
  const btn = page.getByRole("button", { name: "회원 탈퇴하기" });
  if (!(await btn.isDisabled())) throw new Error("확인 체크 전인데 탈퇴 버튼이 눌림");
  await sleep(200);
  await shot("27-withdraw");
  await page.getByLabel("위 내용을 모두 확인했어요").check();
  await btn.click();
  let t = await dialogText(page);
  if (!t.includes("정말 탈퇴할까요?")) throw new Error(t);
  await pressDialog(page, "취소");
  if (!page.url().endsWith("/main/profile/withdraw")) throw new Error("취소했는데 이동함");
  await btn.click();
  t = await dialogText(page);
  await page.locator('[role="alertdialog"] button', { hasText: /^탈퇴$/ }).click();
  await page.waitForURL(/\/goodbye$/, { timeout: 30000 });
  await page.getByRole("heading", { name: "탈퇴가 완료되었어요" }).waitFor();
  await sleep(200);
  await shot("28-goodbye");
});

await check("탈퇴 후 서버 정리: Auth 계정 삭제 · enrollment 삭제 · 학생 보호자/초대 목록에서 제거 · 원래 보호자 유지 · 탈퇴 기록(개인정보 없음)", async () => {
  if (!withdrawnUid) throw new Error("이전 단계 실패");
  const accounts = await emuAccounts();
  if (accounts.some((u) => u.localId === withdrawnUid)) throw new Error("Auth 계정이 남아 있음");
  const owner = accounts.find((u) => u.phoneNumber === "+821011112222");
  const enrolls = await emuDocs("enrollments");
  if (enrolls.some((d) => d.fields?.guardianUid?.stringValue === withdrawnUid)) throw new Error("enrollment 남아 있음");
  const student = await emuDoc("students/student-001");
  const guardians = strArray(student.fields?.guardianUids);
  if (guardians.includes(withdrawnUid)) throw new Error("guardianUids 에 남아 있음");
  if (!owner || !guardians.includes(owner.localId)) throw new Error("원래 보호자까지 지워짐");
  if (strArray(student.fields?.allowedGuardianPhoneHashes).length) throw new Error("초대 번호가 남아 있음");
  const logs = await emuDocs("accountDeletions");
  const log = logs.find((d) => strArray(d.fields?.studentIds).includes("student-001"));
  if (!log) throw new Error("탈퇴 기록 없음");
  if (JSON.stringify(log).includes(withdrawnUid) || JSON.stringify(log).includes("3333")) throw new Error("탈퇴 기록에 개인정보");
  return `guardians=${guardians.length}, logs=${logs.length}`;
});

await check("탈퇴 완료 → 처음 화면으로 → 같은 번호로 로그인해도 자동 연결 안 됨", async () => {
  await page.getByRole("button", { name: "처음 화면으로" }).click();
  await page.waitForURL(/\/onboarding$/, { timeout: 15000 });
  await page.goto(BASE + "/onboarding/login");
  await page.locator("#phone").fill("01033334444");
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.getByLabel("6자리 인증번호").waitFor({ timeout: 20000 });
  await sleep(300);
  const code = await latestCode("+821033334444");
  await page.getByLabel("6자리 인증번호").fill(code);
  await page.getByRole("button", { name: "로그인" }).click();
  const t = await dialogText(page);
  if (!t.includes("등록된 자녀가 없습니다")) throw new Error(t);
  await pressDialog(page, "등록코드 입력");
  await page.waitForURL(/\/onboarding$/, { timeout: 15000 });
});

await check("/goodbye 를 로그인 상태로 열면 홈으로", async () => {
  // 원래 보호자로 다시 로그인
  await page.goto(BASE + "/onboarding/login");
  await page.locator("#phone").fill("01011112222");
  await page.getByRole("button", { name: "인증번호 받기" }).click();
  await page.getByLabel("6자리 인증번호").waitFor({ timeout: 20000 });
  await sleep(300);
  await page.getByLabel("6자리 인증번호").fill(await latestCode("+821011112222"));
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  await page.goto(BASE + "/goodbye");
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  await page.getByText("김민준 학부모님!").waitFor({ timeout: 20000 });
});

// ── 6. 데스크톱 폰 프레임 ────────────────────────────────
const desk = await browser.newContext({ viewport: { width: 1280, height: 860 }, locale: "ko-KR" });
const dp = await desk.newPage();
await check("데스크톱: 480px 폰 프레임 가운데 정렬", async () => {
  await dp.goto(BASE + "/onboarding");
  await dp.getByText("ThinkCampus").first().waitFor();
  const box = await dp.locator("#app-frame").boundingBox();
  if (Math.round(box.width) !== 480) throw new Error("width " + box.width);
  if (Math.abs(box.x - (1280 - 480) / 2) > 2) throw new Error("x " + box.x);
  await checkFontSizes(dp, "21-desktop-onboarding");
  await dp.screenshot({ path: `${SHOTS}/21-desktop-onboarding.png` });
});

await check(`모든 화면 글자 크기 ${MIN_FONT_PX}px 이상`, async () => {
  if (fontViolations.size) {
    const list = [...fontViolations].slice(0, 12).map(([t, n]) => `${n}: ${t}`);
    throw new Error(`${fontViolations.size}건 — ` + list.join(" | "));
  }
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
const relevantErrors = consoleErrors.filter((e) => !/recaptcha|Failed to load resource.*(favicon|icon-)/i.test(e));
console.log(`console errors: ${relevantErrors.length}`);
relevantErrors.slice(0, 20).forEach((e) => console.log("  " + e.slice(0, 220)));
fs.writeFileSync(path.join(HERE, "results.json"), JSON.stringify({ results, consoleErrors }, null, 2));
process.exit(failed.length ? 1 : 0);
