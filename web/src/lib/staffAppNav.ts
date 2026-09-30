/**
 * 직원 앱(센터 · 회사 · 강사) 하단 탭 — 주소는 고정 (/admin/center · /admin · /instructor)
 * 학부모 TabBar 와 같은 높이·모양. 탭은 최대 5개, 글자 14px.
 * 센터: 홈 · 수업 · 채팅(학부모 채팅 · 민원) · 리포트 · 더보기(학생 명단 · 강사 · 공지 · 만족도 · 내 정보)
 */

export type StaffVariant = "center" | "company" | "instructor";

export type StaffNavIcon =
  | "home"
  | "lessons"
  | "students"
  | "instructors"
  | "reports"
  | "comms"
  | "chat"
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
  /** 탭 위 숫자 배지 — StaffShell 이 값을 채운다 (center: 답을 기다리는 학부모 채팅) */
  badge?: "chatWaiting";
}

export const STAFF_BASE: Record<StaffVariant, string> = {
  center: "/admin/center",
  company: "/admin",
  instructor: "/instructor",
};

export const STAFF_TITLE: Record<StaffVariant, string> = {
  center: "프로그램 매니저",
  company: "통합 관리",
  instructor: "강사",
};

const startsWith = (base: string, seg: string) => (p: string) => p === `${base}/${seg}` || p.startsWith(`${base}/${seg}/`);

export function buildStaffNavItems(variant: StaffVariant): StaffNavItem[] {
  const base = STAFF_BASE[variant];
  if (variant === "center") {
    return [
      { href: base, label: "홈", icon: "home", match: (p) => p === base },
      { href: `${base}/lessons`, label: "수업", icon: "lessons", match: (p) => startsWith(base, "lessons")(p) || startsWith(base, "attendance")(p) },
      { href: `${base}/chat`, label: "채팅", icon: "chat", match: (p) => startsWith(base, "chat")(p) || startsWith(base, "inquiries")(p), badge: "chatWaiting" },
      { href: `${base}/reports`, label: "리포트", icon: "reports", match: startsWith(base, "reports") },
      { href: `${base}/more`, label: "더보기", icon: "settings", match: (p) => ["more", "students", "instructors", "comms", "survey", "profile"].some((s) => startsWith(base, s)(p)) },
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
