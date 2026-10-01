"use client";

/**
 * 회사 · 운영 건 목록
 */

import { Badge, Button, Empty, ErrorBox, fmtDate, Loading, PageTitle, RowLink } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PROGRAM_RUN_STATUS_LABEL, useApi, useQuery } from "@/services";

export default function CompanyRunsPage() {
  usePageTitle("운영 건");
  const api = useApi();
  const { data, loading, error, refetch } = useQuery(() => api.company.listRuns(), [api]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageTitle title="운영 건" desc="지자체 계약 한 건이 운영 건 하나예요." right={<Button href="/admin/runs/new" size="sm">새 운영 건</Button>} />
      {!data || data.length === 0 ? (
        <Empty title="운영 건이 없어요" action={<Button href="/admin/runs/new">첫 운영 건 만들기</Button>} />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((r) => (
            <li key={r.id}>
              <RowLink
                href={`/admin/runs/${encodeURIComponent(r.id)}`}
                title={r.title}
                desc={`${r.contractCode} · ${r.campusName} · ${fmtDate(r.startDate)}부터 ${r.totalSessions}회 · 수강 ${r.studentCount}명`}
                badge={<Badge tone={r.status === "active" ? "gold" : r.status === "scheduled" ? "neutral" : "dim"}>{PROGRAM_RUN_STATUS_LABEL[r.status]}</Badge>}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
