import { NextResponse } from "next/server";
import { DEMO_COOKIE, DEMO_HUB_PATH } from "@/lib/demoMode";

/** GET /demo/exit — 체험 쿠키를 지우고 허브로 */
export async function GET() {
  const res = new NextResponse(null, { status: 302, headers: { Location: DEMO_HUB_PATH } });
  res.cookies.set(DEMO_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
