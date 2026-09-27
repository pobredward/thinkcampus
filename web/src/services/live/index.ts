/**
 * 실서비스 API 묶음 — Firebase (Auth · Firestore · Cloud Functions)
 */

import type { Api } from "@/services/api";
import { createLiveGuardianApi } from "./guardianApi";
import { createLiveCenterApi, createLiveCompanyApi, createLiveInstructorApi, createLiveStaffApi } from "./staffApi";

export function createLiveApi(): Api {
  return {
    staff: createLiveStaffApi(),
    guardian: createLiveGuardianApi(),
    center: createLiveCenterApi(),
    instructor: createLiveInstructorApi(),
    company: createLiveCompanyApi(),
  };
}
