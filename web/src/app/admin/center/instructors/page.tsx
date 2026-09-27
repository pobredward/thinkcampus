"use client";

/**
 * 센터 · 강사 — 내 캠퍼스 강사 목록 (이번 주 · 이 운영 건 담당 회차 수) → 강사 화면에서 회차 배정
 */

import { Photo } from "@/components/staff/Photo";
import { Badge, Empty, ErrorBox, Loading, PageTitle, RowLink } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useApi, useQuery } from "@/services";

export default function CenterInstructorsPage() {
  usePageTitle("강사");
  const api = useApi();
  const { selectedRun, runsLoading, summary } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.center.listInstructors(runId) : null), [api, runId]);

  if (runsLoading || (loading && !data)) return <Loading />;
  if (!selectedRun) return <Empty title="운영 건을 먼저 골라 주세요" />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;

  const unassigned = summary?.dashboard.sessionsWithoutInstructor ?? 0;

  return (
    <div>
      <PageTitle title="강사" desc={`${selectedRun.campusName} 강사 ${data?.length ?? 0}명 · 강사를 누르면 회차를 배정할 수 있어요`} />
      {unassigned > 0 && (
        <div className="mb-3 rounded-[16px] border border-danger-border bg-danger-bg px-4 py-3 text-[15px] text-danger">강사가 정해지지 않은 회차가 {unassigned}개 있어요.</div>
      )}
      {!data || data.length === 0 ? (
        <Empty title="이 캠퍼스에 등록된 강사가 없어요" desc="회사 설정에서 강사 계정을 만들면 여기에 보여요." />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((i) => (
            <li key={i.staffId}>
              <RowLink
                href={`/admin/center/instructors/${encodeURIComponent(i.staffId)}`}
                left={<Photo id={i.staffId} name={i.name} photoUrl={i.photoUrl} size={44} />}
                title={i.name}
                desc={`${i.specialties.length ? i.specialties.join(" · ") : "전담 멘토"} · 이번 주 ${i.sessionsThisWeek}회`}
                badge={<Badge tone={i.sessionsInRun > 0 ? "gold" : "neutral"}>이 운영 건 {i.sessionsInRun}회</Badge>}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
