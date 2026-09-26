/** checkStaffAccess Callable 응답과 동일 */
export interface StaffAccess {
  allowed: boolean;
  companyAdmin: boolean;
  centerAdmin: boolean;
  campusIds: string[];
}

export function staffHomePath(access: StaffAccess): string | null {
  if (access.companyAdmin) return "/admin";
  if (access.centerAdmin) return "/admin/center";
  return null;
}

/** 오픈 리다이렉트 방지 — Admin 영역만 */
export function safeAdminNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (/^\/admin(\/|$)/.test(next)) return next;
  return null;
}

/**
 * 로그인 후 이동 경로 — role에 맞게 next를 허용하거나 홈으로
 */
export function resolveStaffDestination(access: StaffAccess, next: string | null | undefined): string | null {
  const home = staffHomePath(access);
  if (!home) return null;

  const safe = safeAdminNext(next);
  if (!safe) return home;

  if (access.companyAdmin) return safe;

  // 센터만: 회사 전용 경로는 센터 홈으로
  if (safe === "/admin" || safe.startsWith("/admin/import") || safe.startsWith("/admin/runs")) {
    return home;
  }
  if (safe.startsWith("/admin/center")) return safe;

  return home;
}

export function canAccessCompanyAdmin(access: StaffAccess): boolean {
  return access.companyAdmin;
}

export function canAccessStaffArea(access: StaffAccess): boolean {
  return access.allowed;
}
