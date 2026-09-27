/**
 * 체험판 API 묶음 — 역할에 맞는 계정으로 DemoWorld 를 읽고 쓴다
 */

import type { DemoRole } from "@/lib/demoMode";
import type { Api } from "@/services/api";
import type { StaffAccess } from "@/services/types";
import { createDemoCenterApi } from "./centerApi";
import { createDemoCompanyApi } from "./companyApi";
import { createDemoGuardianApi } from "./guardianApi";
import { createDemoInstructorApi } from "./instructorApi";
import { delay } from "./select";
import { DEMO_CAMPUS_ID, DEMO_STAFF } from "./world";

export function demoStaffAccess(role: DemoRole): StaffAccess {
  switch (role) {
    case "company":
      return { allowed: true, companyAdmin: true, centerAdmin: false, instructor: false, campusIds: [], displayName: DEMO_STAFF.company.displayName, email: DEMO_STAFF.company.email };
    case "center":
      return { allowed: true, companyAdmin: false, centerAdmin: true, instructor: false, campusIds: [DEMO_CAMPUS_ID], displayName: DEMO_STAFF.center.displayName, email: DEMO_STAFF.center.email };
    case "instructor":
      return { allowed: true, companyAdmin: false, centerAdmin: false, instructor: true, campusIds: [DEMO_CAMPUS_ID], displayName: DEMO_STAFF.instructor.displayName, email: DEMO_STAFF.instructor.email };
    default:
      return { allowed: false, companyAdmin: false, centerAdmin: false, instructor: false, campusIds: [] };
  }
}

export function createDemoApi(role: DemoRole): Api {
  return {
    staff: { checkAccess: () => delay(demoStaffAccess(role)) },
    guardian: createDemoGuardianApi(),
    center: createDemoCenterApi([DEMO_CAMPUS_ID], DEMO_STAFF.center.uid),
    instructor: createDemoInstructorApi(DEMO_STAFF.instructor.uid),
    company: createDemoCompanyApi(DEMO_STAFF.company.uid),
  };
}
