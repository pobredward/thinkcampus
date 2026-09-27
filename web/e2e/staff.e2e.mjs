/**
 * 직원 앱 E2E — 에뮬레이터의 실제 Cloud Functions 로 회사 → 센터 → 강사 → 센터 흐름
 *   회사 명단 등록 → 센터 학생 목록(형제)·강사 배정·공지 → 강사 출결·리포트 작성·검수 요청 → 센터 검수·학부모 공개
 *
 * 준비 (e2e/README.md): 에뮬레이터 + 시드 + `npm run start:emu`(3100) + 직원 계정 3개
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GCLOUD_PROJECT=demo-thinkcampus \
 *     STAFF_NAME=김도현 npx ts-node createStaffUser.ts company@thinkcampus.local 'Passw0rd!' company
 *     STAFF_NAME=이정민 npx ts-node createStaffUser.ts center@thinkcampus.local 'Passw0rd!' center campus-ds26
 *     STAFF_NAME=박지훈 npx ts-node createStaffUser.ts teacher@thinkcampus.local 'Passw0rd!' instructor campus-ds26
 *   npm run e2e:staff      (SKIP_IMPORT=1 이면 명단 등록 단계 생략)
 */
import { chromium } from "playwright";
const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const browser = await chromium.launch({ executablePath: process.env.E2E_CHROMIUM_PATH || undefined });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const results = [];
async function check(name, fn) {
  try { const d = await fn(); results.push(true); console.log("PASS", name, d ?? ""); } catch (e) { results.push(false); console.log("FAIL", name, String(e.message).split("\n")[0]); }
}
async function newPage(email, next) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ko-KR" });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${email} ${e.message.slice(0, 150)}`));
  page.on("console", (m) => { if (m.type() === "error" && !/501|favicon/.test(m.text())) errors.push(`${email} ${m.text().slice(0, 150)}`); });
  await page.goto(`${BASE}/admin/login?next=${encodeURIComponent(next)}`, { waitUntil: "networkidle" });
  await page.locator("#admin-email").fill(email);
  await page.locator("#admin-password").fill("Passw0rd!");
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => u.pathname.startsWith(next), { timeout: 30000 });
  await sleep(1000);
  return page;
}
const text = async (page) => (await page.locator("body").innerText()).replace(/\s+/g, " ");
const toast = async (page) => { const t = page.locator('[role="status"][aria-live="polite"]'); await t.waitFor({ timeout: 15000 }); return (await t.innerText()).trim(); };
const assert = (c, m) => { if (!c) throw new Error(m); };

let sessionId = null;
// 1. 회사: 명단 등록 (2명, 가구 같음)
await check("회사 명단 등록 → 학생·수강·코드", async () => {
  if (process.env.SKIP_IMPORT) return "skipped";
  const page = await newPage("company@thinkcampus.local", "/admin");
  await page.goto(`${BASE}/admin/import`, { waitUntil: "networkidle" });
  await page.locator(".dsg-cell:not(.dsg-cell-header):not(.dsg-cell-gutter)").first().click();
  await page.evaluate(() => {
    const rows = ["박라이브\t20150301\tSEED-ROSTER-001\tcampus-ds26\t\t01055556666", "박라이브2\t20170502\tSEED-ROSTER-001\tcampus-ds26\t\t01055556666"];
    const dt = new DataTransfer(); dt.setData("text/plain", rows.join("\n"));
    document.activeElement?.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await sleep(500);
  await page.getByRole("button", { name: "미리보기" }).click();
  await sleep(2500);
  let t = await text(page);
  assert(t.includes("박라이브2"), "미리보기: " + t.slice(0, 300));
  await page.getByRole("button", { name: "등록하기" }).click();
  const tt = await toast(page);
  assert(tt.includes("2명을 등록했어요"), tt);
  await sleep(1500);
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await sleep(1500);
  t = await text(page);
  assert(t.includes("마지막 명단 등록 2명"), "홈: " + t.slice(0, 300));
  await page.context().close();
});

// 2. 센터: 학생 목록 · 강사 배정 · 공지
await check("센터 학생 2명(형제) · 강사 배정 · 공지", async () => {
  const page = await newPage("center@thinkcampus.local", "/admin/center");
  await page.goto(`${BASE}/admin/center/students`, { waitUntil: "networkidle" });
  await sleep(1500);
  let t = await text(page);
  assert(t.includes("박라이브") && t.includes("형제 박라이브2"), "학생: " + t.slice(0, 400));
  await page.goto(`${BASE}/admin/center/instructors`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.locator("a[href*='/instructors/']").first().click();
  await page.waitForURL(/instructors\//);
  await sleep(1500);
  const assignBtns = page.getByRole("button", { name: /회차 .* 배정$/, disabled: false });
  const n = await assignBtns.count();
  assert(n > 0, "배정 버튼 없음: " + (await text(page)).slice(0, 400));
  await assignBtns.first().click();
  const tt = await toast(page);
  assert(tt.includes("배정했어요"), tt);
  await sleep(1500);
  t = await text(page);
  assert(t.includes("담당"), "담당 표시");
  await page.goto(`${BASE}/admin/center/comms`, { waitUntil: "networkidle" });
  await page.locator("#notice-title").fill("라이브 공지");
  await page.getByRole("button", { name: "보내기" }).click();
  const t2 = await toast(page);
  assert(/보호자 \d+명에게 보냈어요/.test(t2), t2);
  await sleep(1200);
  assert((await text(page)).includes("라이브 공지"), "보낸 공지 목록");
  await page.context().close();
});

// 3. 강사: 담당 회차 → 출결 → 리포트 → 제출
await check("강사 회차 출결 · 리포트 작성 · 검수 요청", async () => {
  const page = await newPage("teacher@thinkcampus.local", "/instructor");
  await page.goto(`${BASE}/instructor/sessions`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.getByRole("group", { name: "기간" }).getByRole("button", { name: /^전체/ }).click();
  await sleep(300);
  // 아직 출결을 넣지 않은 담당 회차 (다시 돌려도 새로 배정된 회차를 고른다)
  const link = page.locator('a[href^="/instructor/session/"]').filter({ hasText: "출결 0/" }).first();
  assert(await link.count(), "담당 회차 없음: " + (await text(page)).slice(0, 300));
  await link.click();
  await page.waitForURL(/\/instructor\/session\//);
  sessionId = page.url().match(/session\/([^?]+)/)[1];
  await sleep(1500);
  await page.goto(`${BASE}/instructor/session/${sessionId}?tab=attendance`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.getByRole("button", { name: /모두 출석/ }).click();
  const t1 = await toast(page);
  assert(t1.includes("출석으로 저장했어요"), t1);
  await sleep(1500);
  await page.goto(`${BASE}/instructor/session/${sessionId}?tab=report`, { waitUntil: "networkidle" });
  await sleep(1500);
  const tas = page.locator("textarea[placeholder^='오늘 수업에서']");
  const n = await tas.count();
  assert(n === 2, "리포트 학생 수 " + n);
  for (let i = 0; i < n; i++) { await tas.nth(i).fill("라이브 피드백입니다."); await tas.nth(i).blur(); await sleep(400); }
  await sleep(1500);
  await page.getByRole("button", { name: /리포트 센터 검수 요청/ }).click();
  const t2 = await toast(page);
  assert(t2.includes("2명 리포트를 센터 검수로 보냈어요"), t2);
  await page.context().close();
});

// 4. 센터: 검수 대기 2 → 공개
await check("센터 리포트 검수 → 학부모 공개", async () => {
  const page = await newPage("center@thinkcampus.local", "/admin/center");
  await sleep(1000);
  let t = await text(page);
  assert(t.includes("검수 대기 리포트 2"), "홈 KPI: " + t.slice(0, 500));
  await page.goto(`${BASE}/admin/center/reports`, { waitUntil: "networkidle" });
  await sleep(1500);
  await page.getByRole("button", { name: /2명 모두 학부모 공개/ }).click();
  const tt = await toast(page);
  assert(tt.includes("학부모에게 공개했어요"), tt);
  await sleep(1500);
  await page.getByRole("button", { name: /공개됨/ }).click();
  await sleep(500);
  t = await text(page);
  assert(t.includes("박라이브") && t.includes("학부모 공개"), "공개 목록: " + t.slice(0, 300));
  await page.context().close();
});

await check("페이지 오류 없음", async () => { assert(errors.length === 0, errors[0]); });
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
await browser.close();
process.exit(passed === results.length ? 0 : 1);
