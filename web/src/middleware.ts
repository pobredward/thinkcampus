import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const GUARDIAN = "/demo/guardian";
const COMPANY = "/demo/company";
const CENTER = "/demo/center";

function rewriteDemo(
  request: NextRequest,
  prefix: string,
  internalPrefix: string,
  role: string,
  defaultSuffix = "",
) {
  const { pathname } = request.nextUrl;
  if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) return null;

  let suffix = "";
  if (pathname.length > prefix.length) {
    suffix = pathname.slice(prefix.length);
  } else if (defaultSuffix) {
    suffix = defaultSuffix;
  }

  const internal = suffix ? `${internalPrefix}${suffix}` : internalPrefix;
  const url = request.nextUrl.clone();
  url.pathname = internal;
  const res = NextResponse.rewrite(url);
  res.headers.set("x-tc-demo-role", role);
  return res;
}

export function middleware(request: NextRequest) {
  return (
    rewriteDemo(request, GUARDIAN, "/main", "guardian") ??
    rewriteDemo(request, COMPANY, "/admin", "company") ??
    rewriteDemo(request, CENTER, "/admin/center", "center", "/attendance") ??
    NextResponse.next()
  );
}

export const config = {
  matcher: [
    "/demo/guardian",
    "/demo/guardian/:path*",
    "/demo/company",
    "/demo/company/:path*",
    "/demo/center",
    "/demo/center/:path*",
  ],
};
