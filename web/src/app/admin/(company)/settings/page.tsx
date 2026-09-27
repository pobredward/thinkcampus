"use client";

/**
 * 회사 · 설정 — 내 계정 · 직원 · 캠퍼스
 */

import { StaffProfile } from "@/components/staff/StaffProfile";
import { Badge, Empty, Loading, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { STAFF_ROLE_LABEL, useApi, useQuery } from "@/services";

export default function CompanySettingsPage() {
  usePageTitle("설정");
  const api = useApi();
  const { data: staff, loading } = useQuery(() => api.company.listStaff(), [api]);
  const { data: campuses } = useQuery(() => api.company.listCampuses(), [api]);
  const campusName = (id: string) => campuses?.find((c) => c.id === id)?.name ?? id;

  return (
    <div>
      <StaffProfile />

      <SectionLabel right={`${staff?.length ?? 0}명`}>직원</SectionLabel>
      {loading && !staff ? (
        <Loading />
      ) : !staff || staff.length === 0 ? (
        <Empty title="등록된 직원이 없어요" />
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((s) => (
            <li key={s.uid} className="flex items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold text-fg">{s.displayName}</p>
                <p className="truncate text-[14px] text-sub">
                  {s.email ?? "-"}
                  {s.campusIds.length > 0 ? ` · ${s.campusIds.map(campusName).join(", ")}` : ""}
                </p>
              </div>
              <Badge tone={s.role === "companyAdmin" ? "gold" : "neutral"}>{STAFF_ROLE_LABEL[s.role]}</Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[14px] text-faint">직원 계정 추가·권한 변경은 scripts/createStaffUser.ts 로 해요 (다음 단계에서 화면으로 옮길 예정).</p>

      <SectionLabel>캠퍼스</SectionLabel>
      <ul className="flex flex-col gap-2">
        {(campuses ?? []).map((c) => (
          <li key={c.id} className="rounded-[16px] border border-line bg-card px-4 py-3">
            <p className="text-[16px] font-bold text-fg">{c.name}</p>
            <p className="text-[14px] text-sub">
              {c.municipalityName} · {c.address ?? ""} · <span className="font-mono">{c.id}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
