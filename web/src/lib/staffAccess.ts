/** checkStaffAccess Callable 응답과 동일 (services/types.ts 의 StaffAccess) */
import type { StaffAccess } from "@/services/types";

export type { StaffAccess };

export const EMPTY_STAFF_ACCESS: StaffAccess = {
  allowed: false,
  companyAdmin: false,
  centerAdmin: false,
  instructor: false,
  campusIds: [],
};

/** 역할별 첫 화면 — 회사 → 센터 → 강사 순 */
export function staffHomePath(access: StaffAccess): string | null {
  if (access.companyAdmin) return "/admin";
  if (access.centerAdmin) return "/admin/center";
  if (access.instructor) return "/instructor";
  return null;
}

/** 오픈 리다이렉트 방지 — 직원 영역만 */
export function safeStaffNext(next: string | null | undefined): string | null {
  if (!next) return null;
  if (/^\/(admin|instructor)(\/|$)/.test(next)) return next;
  return null;
}

/** 이 계정이 그 경로를 볼 수 있는지 */
export function canOpenStaffPath(access: StaffAccess, path: string): boolean {
  if (path === "/instructor" || path.startsWith("/instructor/")) return access.instructor || access.companyAdmin;
  if (path === "/admin/center" || path.startsWith("/admin/center/")) return access.centerAdmin || access.companyAdmin;
  if (path === "/admin" || path.startsWith("/admin/")) return access.companyAdmin;
  return false;
}

/** 로그인 후 이동 경로 — 권한에 맞으면 next, 아니면 홈 */
export function resolveStaffDestination(access: StaffAccess, next: string | null | undefined): string | null {
  const home = staffHomePath(access);
  if (!home) return null;
  const safe = safeStaffNext(next);
  if (!safe) return home;
  return canOpenStaffPath(access, safe) ? safe : home;
}
