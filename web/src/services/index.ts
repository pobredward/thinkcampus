"use client";

/**
 * useApi() — 체험이면 services/demo, 아니면 services/live
 *
 * 화면은 `const api = useApi();` 뒤에 `api.center.listSchedule(...)` 처럼 쓴다.
 * 체험 여부는 DemoProvider(루트 layout 이 쿠키에서 읽음)가 정한다.
 */

import { useMemo } from "react";
import { useDemo } from "@/providers/DemoProvider";
import type { Api } from "./api";
import { createDemoApi } from "./demo";
import { createLiveApi } from "./live";

let liveApi: Api | null = null;

function getLiveApi(): Api {
  if (!liveApi) liveApi = createLiveApi();
  return liveApi;
}

export function useApi(): Api {
  const { role } = useDemo();
  return useMemo(() => (role ? createDemoApi(role) : getLiveApi()), [role]);
}

export type { Api, CenterApi, CompanyApi, GuardianApi, InstructorApi, PartnerApi, StaffApi } from "./api";
export * from "./types";
export { useMutation, useQuery } from "./hooks";
