/**
 * 체험 모드 E2E — 등록코드·로그인 없이 바로 메인, 010-7656-7933 계정으로 보이는지 (Firebase 접속 없음)
 *
 *   cd web && npm run build:demo && npm run start:demo      (포트 3200)
 *   npm run e2e:demo
 *
 * 스크린샷: e2e/shots/demo-*.png
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.E2E_DEMO_BASE_URL ?? "http://127.0.0.1:3200";
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

const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH || undefined });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "ko-KR",
});
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
await ctx.addInitScript(() => {
  try { Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }); } catch {}
});
const page = await ctx.newPage();

// Firebase(인증·Firestore·Functions)로 나가는 요청이 하나도 없어야 한다
const firebaseCalls = [];
page.on("request", (r) => {
  if (/identitytoolkit|securetoken|firestore\.googleapis|firebaseio|cloudfunctions|asia-northeast3-|recaptcha|firebaseinstallations/.test(r.url())) firebaseCalls.push(r.url());
});
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

const dialogText = async () => {
  const dlg = page.locator('[role="alertdialog"]');
  await dlg.waitFor({ timeout: 10000 });
  const t = (await dlg.innerText()).replace(/\s+/g, " ").trim();
  await dlg.getByRole("button").last().click();
  await dlg.waitFor({ state: "detached" });
  return t;
};

await check("첫 주소(/) → 등록코드 없이 바로 메인 · 010-7656-7933 계정(자녀 2명: 김민준 · 이서연)", async () => {
  await page.goto(BASE + "/");
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  await page.getByText("김민준 학부모님!").waitFor({ timeout: 20000 });
  await page.getByText("연결된 자녀 2명").waitFor();
  await page.getByRole("button", { name: /자녀 전환/ }).waitFor();
  await page.getByText("현재 수강 중인 프로그램").waitFor();
  if (await page.getByText("수강 예정 프로그램").count()) throw new Error("수강 예정 섹션이 보임");
  await sleep(300);
  await page.screenshot({ path: `${SHOTS}/demo-01-home.png` });
});

await check("등록코드 화면(/onboarding) · 로그인 화면으로 들어와도 메인으로", async () => {
  await page.goto(BASE + "/onboarding");
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  await page.goto(BASE + "/onboarding/login");
  await page.waitForURL(/\/main$/, { timeout: 20000 });
  await page.getByText("김민준 학부모님!").waitFor({ timeout: 20000 });
});

await check("자녀 전환 → 이서연", async () => {
  await page.getByRole("button", { name: /자녀 전환/ }).click();
  const sheet = page.getByRole("dialog", { name: "자녀 선택" });
  await sheet.getByRole("option", { name: /이서연/ }).click();
  await sheet.waitFor({ state: "detached" });
  await page.getByText("이서연 학부모님!").waitFor();
  await page.getByRole("button", { name: /자녀 전환/ }).click();
  await page.getByRole("dialog", { name: "자녀 선택" }).getByRole("option", { name: /김민준/ }).click();
  await page.getByText("김민준 학부모님!").waitFor();
});

await check("수강 중 → 회차 → 안내 페이지 (로그인 요구 없음)", async () => {
  await page.getByRole("button", { name: /상세 보기$/ }).click();
  await page.waitForURL(/\/main\/program\/prog-001\?/, { timeout: 15000 });
  await page.getByRole("heading", { name: "회차별 수업" }).waitFor();
  await page.getByRole("button", { name: /^3회차 / }).click();
  await page.getByText("10:18 입실 · 18분 늦음").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "← 회차 목록" }).click();
  await page.getByRole("button", { name: "공지사항", exact: true }).click();
  await page.getByRole("heading", { level: 1, name: "공지사항" }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "← 프로그램" }).click();
  await page.getByRole("heading", { name: "회차별 수업" }).waitFor();
});

await check("주소로 바로 열기(새로고침) — 회차 화면 · 종합 리포트 공유는 서버 없이 링크 복사", async () => {
  await page.goto(BASE + "/main/program/prog-001/session/sess-02?tab=content&sid=student-001&studentName=%EA%B9%80%EB%AF%BC%EC%A4%80");
  await page.getByRole("heading", { name: "프로그램 내용" }).waitFor({ timeout: 20000 });
  await page.goto(BASE + "/main/program/prog-001/report?sid=student-001&studentName=%EA%B9%80%EB%AF%BC%EC%A4%80");
  await page.getByRole("heading", { name: "종합 학습 리포트" }).waitFor({ timeout: 20000 });
  await page.getByRole("button", { name: /리포트 공유하기/ }).click();
  await page.getByRole("status").filter({ hasText: "링크가 복사되었습니다" }).waitFor({ timeout: 10000 });
});

await check("내 정보: 010-7656-7933 · 김민준 · 이서연(부(아빠), 달성캠퍼스)", async () => {
  await page.goto(BASE + "/main/profile");
  await page.getByText("010-7656-7933").waitFor({ timeout: 20000 });
  for (const t of ["김민준", "이서연"]) await page.getByText(t).first().waitFor();
  await page.getByText("부(아빠)").first().waitFor();
  await page.getByText("달성캠퍼스").first().waitFor();
  await sleep(300);
  await page.screenshot({ path: `${SHOTS}/demo-02-profile.png`, fullPage: true });
});

await check("로그아웃 · 보호자 초대 · 회원 탈퇴는 막고 안내만 (주소 그대로)", async () => {
  await page.getByRole("button", { name: "로그아웃" }).click();
  const t1 = await dialogText();
  if (!t1.includes("로그아웃할 수 없어요")) throw new Error(t1);
  if (!page.url().endsWith("/main/profile")) throw new Error(page.url());

  await page.getByRole("button", { name: /보호자 초대/ }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.locator("#invite-phone").fill("01099998888");
  await sheet.getByRole("button", { name: "부(아빠)" }).click();
  await sheet.getByRole("button", { name: /초대하기|초대 보내기|추가/ }).last().click();
  const t2 = await dialogText();
  if (!t2.includes("보호자를 초대할 수 없어요")) throw new Error(t2);
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "detached", timeout: 5000 }).catch(() => {});

  await page.goto(BASE + "/main/profile/withdraw");
  await page.getByText("010-7656-7933", { exact: false }).first().waitFor({ timeout: 20000 });
  await page.getByLabel("위 내용을 모두 확인했어요").check();
  await page.getByRole("button", { name: /탈퇴하기/ }).click();
  const dlg = page.locator('[role="alertdialog"]');
  await dlg.waitFor();
  await dlg.getByRole("button", { name: "탈퇴" }).click();
  // 확인 창이 닫히자마자 안내 창이 뜬다
  await page.locator('[role="alertdialog"]').filter({ hasText: "탈퇴할 수 없어요" }).waitFor({ timeout: 10000 });
  const t3 = await dialogText();
  if (!t3.includes("탈퇴할 수 없어요")) throw new Error(t3);
  if (!page.url().endsWith("/main/profile/withdraw")) throw new Error(page.url());
});

await check("Firebase 로 나간 요청 없음 · 페이지 오류 없음", async () => {
  if (firebaseCalls.length) throw new Error(firebaseCalls.slice(0, 3).join(", "));
  if (pageErrors.length) throw new Error(pageErrors.slice(0, 3).join(" | "));
});

await browser.close();
const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
