/**
 * 공유 링크(/r/[token]) 로 열리는 종합 리포트 — 로그인 없이 읽는다
 *
 *   demo-<reportId>  체험판 세계의 리포트. 링크를 받은 사람 브라우저에서 같은 시드로 다시 만든다 (쿠키·세션 불필요)
 *   그 외             Cloud Function getSharedReport (shareTokens/{token} 검증 · 7일 만료)
 */

import type { StudentReport } from "@/data/dummyReport";

export const DEMO_SHARE_PREFIX = "demo-";
/** 실서비스 초기 단계(서버에 리포트가 없는 계정)의 예시 리포트 링크 */
export const SAMPLE_SHARE_TOKEN = "sample";

export type SharedReportResult = { status: "ok"; report: StudentReport; expiresAt: string | null; demo: boolean } | { status: "expired"; expiresAt: string | null } | { status: "not-found" };

export function demoShareToken(reportId: string): string {
  return `${DEMO_SHARE_PREFIX}${reportId}`;
}

export async function fetchSharedReport(token: string): Promise<SharedReportResult> {
  if (!token) return { status: "not-found" };

  if (token === SAMPLE_SHARE_TOKEN) {
    const { DUMMY_REPORT } = await import("@/data/dummyReport");
    return { status: "ok", report: DUMMY_REPORT, expiresAt: null, demo: true };
  }

  if (token.startsWith(DEMO_SHARE_PREFIX)) {
    const reportId = token.slice(DEMO_SHARE_PREFIX.length);
    const { buildDemoWorld } = await import("@/services/demo/world");
    const found = buildDemoWorld().finalReports.find((r) => r.reportId === reportId);
    if (!found) return { status: "not-found" };
    const report: StudentReport & { programRunId?: string } = { ...found };
    delete report.programRunId;
    return { status: "ok", report, expiresAt: null, demo: true };
  }

  const { call } = await import("@/services/live/call");
  try {
    const res = await call<{ token: string }, { report: Record<string, unknown> & { reportId: string }; expiresAt: string }>("getSharedReport", { token });
    const { normalizeStudentReport } = await import("@/lib/reportNormalize");
    return { status: "ok", report: normalizeStudentReport(res.report), expiresAt: res.expiresAt, demo: false };
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    const details = (e as { details?: { expiresAt?: string } })?.details;
    if (code.endsWith("deadline-exceeded") || code.endsWith("resource-exhausted")) throw e;
    if (code.endsWith("failed-precondition")) return { status: "expired", expiresAt: details?.expiresAt ?? null };
    if (code.endsWith("not-found") || code.endsWith("invalid-argument") || code.endsWith("permission-denied")) return { status: "not-found" };
    throw e;
  }
}
