import { NextResponse } from "next/server";
import {
  DEMO_COOKIE,
  DEMO_COOKIE_MAX_AGE,
  DEMO_HUB_PATH,
  DEMO_ROLE_HOME,
  isDemoRole,
} from "@/lib/demoMode";

/**
 * GET /demo/<role> — 체험 쿠키를 심고 그 역할의 실제 첫 화면으로 보낸다.
 * (허브의 링크 · 외부에서 공유한 주소가 여기로 들어온다)
 */
/** 같은 호스트로 돌아가도록 상대 주소로 보낸다 (프록시·Vercel 뒤에서도 안전) */
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 302, headers: { Location: path } });
}

export async function GET(request: Request, ctx: { params: Promise<{ role: string }> }) {
  const { role } = await ctx.params;
  const url = new URL(request.url);
  if (!isDemoRole(role)) return redirectTo(DEMO_HUB_PATH);
  // ?next=/admin/center/lessons 처럼 그 역할 영역 안의 주소로 바로 들어갈 수 있다
  const next = url.searchParams.get("next");
  const home = DEMO_ROLE_HOME[role];
  const target = next && (next === home || next.startsWith(`${home}/`)) ? next : home;
  const res = redirectTo(target);
  res.cookies.set(DEMO_COOKIE, role, {
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false, // 배너의 "체험 데이터 초기화"가 클라이언트에서 역할을 읽는다
  });
  return res;
}
