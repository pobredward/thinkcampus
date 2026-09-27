/**
 * 체험판(데모) 모드 — 쿠키 하나로 켜고 끈다
 *
 *   /demo            역할 선택 허브 (Firebase 없이 뜬다)
 *   /demo/<role>     쿠키 tc_demo=<role> 를 심고 그 역할의 실제 주소로 보낸다
 *   /demo/exit       쿠키를 지우고 허브로
 *
 * 화면 주소는 실서비스와 똑같다 (/main, /instructor, /admin/center, /admin).
 * 어느 쪽 데이터를 쓸지는 services/ 계층이 DemoProvider 의 역할을 보고 고른다 —
 * 화면 코드에는 "체험이면 …" 분기가 없다.
 *
 * 서버(루트 layout)가 쿠키를 읽어 DemoProvider 에 넘기므로 첫 렌더부터 서버·클라이언트가 같은 값을 본다
 * (예전 /demo/* rewrite 방식의 하이드레이션 오류가 없다).
 */

export type DemoRole = "guardian" | "instructor" | "center" | "company";

export const DEMO_COOKIE = "tc_demo";
export const DEMO_HUB_PATH = "/demo";
export const DEMO_COOKIE_MAX_AGE = 60 * 60 * 24; // 하루

export const DEMO_ROLES: DemoRole[] = ["guardian", "instructor", "center", "company"];

export function isDemoRole(v: unknown): v is DemoRole {
  return typeof v === "string" && (DEMO_ROLES as string[]).includes(v);
}

/** 역할별 첫 화면 (실서비스 주소) */
export const DEMO_ROLE_HOME: Record<DemoRole, string> = {
  guardian: "/main",
  instructor: "/instructor",
  center: "/admin/center",
  company: "/admin",
};

/** 체험 진입 주소 — 허브·문서·외부 링크에서 쓴다 */
export function demoEntryPath(role: DemoRole): string {
  return `${DEMO_HUB_PATH}/${role}`;
}

export const DEMO_ROLE_LABEL: Record<DemoRole, string> = {
  guardian: "학부모",
  instructor: "강사",
  center: "센터 관리자",
  company: "회사 관리자",
};

/** 역할이 이 화면 영역을 쓸 수 있는지 — 다른 역할의 주소로 가면 그 역할의 홈으로 안내 */
export function demoRoleForPath(pathname: string): DemoRole | null {
  if (pathname === "/main" || pathname.startsWith("/main/")) return "guardian";
  if (pathname === "/instructor" || pathname.startsWith("/instructor/")) return "instructor";
  if (pathname === "/admin/center" || pathname.startsWith("/admin/center/")) return "center";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "company";
  return null;
}
