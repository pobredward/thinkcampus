/**
 * /demo/* 체험판 — 역할별 진입 경로와 모의 데이터
 * (전역 NEXT_PUBLIC_DEMO_MODE 와 별개: 운영 사이트는 /demo 만 체험)
 */

import type { User } from "firebase/auth";
import type { StaffAccess } from "@/lib/staffAccess";
import type { Child } from "@/hooks/useChildren";
import { DEMO_CHILDREN, DEMO_GUARDIAN_NAME, DEMO_PHONE_E164 } from "@/lib/demo";

export type DemoRole = "guardian" | "instructor" | "center" | "company";

export const DEMO_HUB_PATH = "/demo";

export const DEMO_ROLE_PATH: Record<DemoRole, string> = {
  guardian: "/demo/guardian",
  instructor: "/demo/instructor",
  center: "/demo/center",
  company: "/demo/company",
};

export function demoRoleFromPath(pathname: string | null | undefined): DemoRole | null {
  if (!pathname?.startsWith(DEMO_HUB_PATH + "/")) return null;
  const seg = pathname.split("/")[2];
  if (seg === "guardian" || seg === "instructor" || seg === "center" || seg === "company") return seg;
  return null;
}

export function isDemoPortalPath(pathname: string | null | undefined): boolean {
  return demoRoleFromPath(pathname) !== null;
}

/** 학부모 앱 URL — /main/* ↔ /demo/guardian/* */
export function mapMainPath(mainPath: string, mainBase: string): string {
  if (mainBase === "/main" || !mainPath.startsWith("/main")) return mainPath;
  const rest = mainPath.slice("/main".length);
  return rest ? `${mainBase}${rest}` : mainBase;
}

export function mainBaseFromPath(pathname: string | null | undefined): string {
  return demoRoleFromPath(pathname) === "guardian" ? DEMO_ROLE_PATH.guardian : "/main";
}

export const DEMO_GUARDIAN_USER = {
  uid: "demo-guardian-01076567933",
  phoneNumber: DEMO_PHONE_E164,
  displayName: DEMO_GUARDIAN_NAME,
  isAnonymous: false,
  providerData: [],
} as unknown as User;

export const DEMO_STAFF_COMPANY_USER = {
  uid: "demo-staff-company",
  email: "admin@demo.thinkcampus.kr",
  displayName: "김운영",
  isAnonymous: false,
  providerData: [],
} as unknown as User;

export const DEMO_STAFF_CENTER_USER = {
  uid: "demo-staff-center",
  email: "center@demo.thinkcampus.kr",
  displayName: "이센터",
  isAnonymous: false,
  providerData: [],
} as unknown as User;

export const DEMO_INSTRUCTOR_USER = {
  uid: "demo-instructor",
  email: "teacher@demo.thinkcampus.kr",
  displayName: "박강사",
  isAnonymous: false,
  providerData: [],
} as unknown as User;

export function demoStaffAccess(role: DemoRole): StaffAccess {
  if (role === "company") {
    return { allowed: true, companyAdmin: true, centerAdmin: false, campusIds: ["campus-ds26"] };
  }
  if (role === "center") {
    return { allowed: true, companyAdmin: false, centerAdmin: true, campusIds: ["campus-ds26"] };
  }
  return { allowed: false, companyAdmin: false, centerAdmin: false, campusIds: [] };
}

export function demoUserForRole(role: DemoRole): User {
  switch (role) {
    case "guardian":
      return DEMO_GUARDIAN_USER;
    case "company":
      return DEMO_STAFF_COMPANY_USER;
    case "center":
      return DEMO_STAFF_CENTER_USER;
    case "instructor":
      return DEMO_INSTRUCTOR_USER;
  }
}

export const DEMO_PORTAL_CHILDREN: Child[] = DEMO_CHILDREN;

export const DEMO_CENTER_RUNS = [
  {
    id: "demo-run-roster-001",
    contractCode: "SEED-ROSTER-001",
    campusId: "campus-ds26",
    municipalityName: "달성군",
    campusName: "달성캠퍼스",
  },
  {
    id: "demo-run-stem-2026",
    contractCode: "DG-2026-STEM",
    campusId: "campus-ds26",
    municipalityName: "달성군",
    campusName: "달성캠퍼스",
  },
] as const;

export const DEMO_CENTER_SESSIONS = [
  { id: "demo-rs-1", sessionNumber: 1, topic: "나를 표현하는 첫걸음", scheduledDate: "2026-09-05" },
  { id: "demo-rs-2", sessionNumber: 2, topic: "협동과 소통", scheduledDate: "2026-09-19" },
  { id: "demo-rs-3", sessionNumber: 3, topic: "창의적 문제 해결", scheduledDate: "2026-10-03" },
] as const;

export const DEMO_CENTER_STUDENTS = [
  { studentId: "student-001", name: "신민준", status: "present" as const },
  { studentId: "student-002", name: "신서연", status: "late" as const, lateMinutes: 8 },
  { studentId: "student-004", name: "김하은", status: undefined },
] as const;

export const DEMO_IMPORT_PREVIEW = {
  dryRun: true,
  rowCount: 3,
  createdStudents: 2,
  updatedStudents: 1,
  createdProgramEnrollments: 3,
  createdEnrollmentCodes: 2,
  previews: [
    {
      rowIndex: 1,
      studentName: "홍길동",
      householdId: "hh-demo-1",
      enrollmentCode: "AB12CD",
      contractCode: "SEED-ROSTER-001",
    },
    {
      rowIndex: 2,
      studentName: "홍길순",
      householdId: "hh-demo-1",
      enrollmentCode: "EF34GH",
      contractCode: "SEED-ROSTER-001",
    },
    {
      rowIndex: 3,
      studentName: "이민수",
      householdId: "hh-demo-2",
      enrollmentCode: "IJ56KL",
      contractCode: "SEED-ROSTER-001",
    },
  ],
  errors: [] as Array<{ rowIndex: number; message: string }>,
};

export const DEMO_PORTAL_BLOCKED = {
  signOut: "체험판에서는 로그아웃할 수 없어요. 역할 선택 화면으로 돌아가려면 상단 배너를 이용해 주세요.",
  invite: "체험판에서는 보호자 초대를 할 수 없어요.",
  withdraw: "체험판에서는 회원 탈퇴를 할 수 없어요.",
  guardianName: "체험판에서는 이름을 바꿀 수 없어요.",
  adminSave: "체험판에서는 실제 저장되지 않아요. 화면 흐름만 확인할 수 있습니다.",
} as const;
