/**
 * 직원 앱(센터 · 회사 · 강사) 하단 탭 — 주소는 고정 (/admin/center · /admin · /instructor)
 * 학부모 TabBar 와 같은 높이·모양. 탭은 최대 5개, 글자 14px.
 */

export type StaffVariant = "center" | "company" | "instructor";

export type StaffNavIcon =
  | "home"
  | "lessons"
  | "students"
  | "instructors"
  | "reports"
  | "comms"
  | "import"
  | "runs"
  | "policy"
  | "settings"
  | "user";

export interface StaffNavItem {
  href: string;
  label: string;
  icon: StaffNavIcon;
  match: (pathname: string) => boolean;
}

export const STAFF_BASE: Record<StaffVariant, string> = {
  center: "/admin/center",
  company: "/admin",
  instructor: "/instructor",
};

export const STAFF_TITLE: Record<StaffVariant, string> = {
  center: "센터 관리",
  company: "회사 관리",
  instructor: "강사",
};

const startsWith = (base: string, seg: string) => (p: string) => p === `${base}/${seg}` || p.startsWith(`${base}/${seg}/`);

export function buildStaffNavItems(variant: StaffVariant): StaffNavItem[] {
  const base = STAFF_BASE[variant];
  if (variant === "center") {
    return [
      { href: base, label: "홈", icon: "home", match: (p) => p === base },
      { href: `${base}/lessons`, label: "수업", icon: "lessons", match: (p) => startsWith(base, "lessons")(p) || startsWith(base, "attendance")(p) },
      { href: `${base}/students`, label: "학생", icon: "students", match: startsWith(base, "students") },
      { href: `${base}/reports`, label: "리포트", icon: "reports", match: startsWith(base, "reports") },
      { href: `${base}/more`, label: "더보기", icon: "settings", match: (p) => ["more", "instructors", "comms", "profile"].some((s) => startsWith(base, s)(p)) },
    ];
  }
  if (variant === "company") {
    return [
      { href: base, label: "홈", icon: "home", match: (p) => p === base },
      { href: `${base}/runs`, label: "운영 건", icon: "runs", match: startsWith(base, "runs") },
      { href: `${base}/import`, label: "명단", icon: "import", match: startsWith(base, "import") },
      { href: `${base}/policy`, label: "리포트", icon: "policy", match: startsWith(base, "policy") },
      { href: `${base}/settings`, label: "설정", icon: "settings", match: startsWith(base, "settings") },
    ];
  }
  return [
    { href: base, label: "오늘", icon: "home", match: (p) => p === base },
    { href: `${base}/sessions`, label: "내 수업", icon: "lessons", match: (p) => startsWith(base, "sessions")(p) || startsWith(base, "session")(p) },
    { href: `${base}/profile`, label: "내 정보", icon: "user", match: startsWith(base, "profile") },
  ];
}
