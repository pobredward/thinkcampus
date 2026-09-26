/** 센터·회사 스태프 앱 하단 탭 (모바일 우선, 학부모 TabBar와 동일 높이) */

export type StaffNavIcon =
  | "home"
  | "lessons"
  | "students"
  | "instructors"
  | "people"
  | "reports"
  | "comms"
  | "import"
  | "runs"
  | "policy"
  | "settings";

export interface StaffNavItem {
  href: string;
  label: string;
  icon: StaffNavIcon;
  match: (pathname: string) => boolean;
}

export function centerStaffBase(pathname: string, demoCenter: boolean): string {
  return demoCenter || pathname.startsWith("/demo/center") ? "/demo/center" : "/admin/center";
}

export function companyStaffBase(pathname: string, demoCompany: boolean): string {
  if (demoCompany || pathname.startsWith("/demo/company")) return "/demo/company";
  return "/admin";
}

export function buildCenterNavItems(base: string): StaffNavItem[] {
  return [
    { href: base, label: "홈", icon: "home", match: (p) => p === base },
    {
      href: `${base}/lessons`,
      label: "수업",
      icon: "lessons",
      match: (p) => p.startsWith(`${base}/lessons`) || p.startsWith(`${base}/attendance`),
    },
    {
      href: `${base}/students`,
      label: "학생",
      icon: "students",
      match: (p) =>
        p.startsWith(`${base}/students`) ||
        p.startsWith(`${base}/roster`) ||
        (p.startsWith(`${base}/people`) && !p.includes("/instructors")),
    },
    {
      href: `${base}/instructors`,
      label: "강사",
      icon: "instructors",
      match: (p) => p.startsWith(`${base}/instructors`),
    },
  ];
}

export function buildCompanyNavItems(base: string): StaffNavItem[] {
  return [
    { href: base, label: "홈", icon: "home", match: (p) => p === base },
    {
      href: `${base}/import`,
      label: "명단",
      icon: "import",
      match: (p) => p.startsWith(`${base}/import`),
    },
    {
      href: `${base}/runs`,
      label: "운영 건",
      icon: "runs",
      match: (p) => p.startsWith(`${base}/runs`),
    },
    {
      href: `${base}/policy`,
      label: "정책",
      icon: "policy",
      match: (p) => p.startsWith(`${base}/policy`),
    },
    {
      href: `${base}/settings`,
      label: "설정",
      icon: "settings",
      match: (p) => p.startsWith(`${base}/settings`) || p.startsWith(`${base}/profile`),
    },
  ];
}
