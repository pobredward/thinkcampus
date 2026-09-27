"use client";

/**
 * 센터 · 리포트 검수 — 상태 칩(검수 대기 · 승인 대기 · 작성 중 · 공개) → 회차별 묶음 → 공개/승인 요청/반려
 *   ?session=<id> 로 오면 그 회차만
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ReportReviewList } from "@/components/staff/ReportReview";
import { ChipRow, Empty, ErrorBox, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useApi, useQuery, type SessionReportStatus } from "@/services";

type StatusFilter = "pending" | SessionReportStatus | "all";

export default function CenterReportsPage() {
  usePageTitle("리포트 검수");
  const api = useApi();
  const router = useRouter();
  const sp = useSearchParams();
  const { selectedRun, runsLoading } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const session = sp.get("session");
  const status = (sp.get("status") as StatusFilter | null) ?? (session ? "all" : "pending");

  const { data, loading, error, refetch } = useQuery(
    () => (runId ? api.center.listReports({ programRunId: runId, runSessionId: session ?? undefined }) : null),
    [api, runId, session],
  );

  const counts = useMemo(() => {
    const c = { pending: 0, submitted: 0, reviewed: 0, draft: 0, published: 0, all: data?.length ?? 0 };
    for (const r of data ?? []) {
      c[r.status]++;
      if (r.status === "submitted" || (r.status === "reviewed" && selectedRun?.reportPolicy.requireCompanyApproval)) c.pending++;
    }
    return c;
  }, [data, selectedRun]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (status === "all") return data;
    if (status === "pending") return data.filter((r) => r.status === "submitted" || (r.status === "reviewed" && selectedRun?.reportPolicy.requireCompanyApproval));
    return data.filter((r) => r.status === status);
  }, [data, status, selectedRun]);

  const setStatus = (v: StatusFilter) => {
    const p = new URLSearchParams(sp.toString());
    p.set("status", v);
    router.replace(`/admin/center/reports?${p}`, { scroll: false });
  };

  if (runsLoading || (loading && !data)) return <Loading label="리포트를 불러오는 중..." />;
  if (!selectedRun) return <Empty title="운영 건을 먼저 골라 주세요" />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;

  const requireCompanyApproval = selectedRun.reportPolicy.requireCompanyApproval;

  return (
    <div>
      {session && (
        <Link href="/admin/center/reports" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
          ‹ 전체 리포트
        </Link>
      )}
      <PageTitle
        title="리포트 검수"
        desc={requireCompanyApproval ? "이 운영 건은 센터 검수 뒤 회사 승인을 거쳐 학부모에게 공개돼요." : "센터가 확인하면 바로 학부모에게 공개돼요."}
      />
      <ChipRow
        label="상태"
        value={status}
        onChange={setStatus}
        items={[
          { id: "pending", label: "검수 대기", count: counts.pending },
          ...(requireCompanyApproval ? [{ id: "reviewed" as const, label: "승인 대기", count: counts.reviewed }] : []),
          { id: "draft", label: "작성 중", count: counts.draft },
          { id: "published", label: "공개됨", count: counts.published },
          { id: "all", label: "전체", count: counts.all },
        ]}
      />
      <div className="mt-3">
        <ReportReviewList rows={rows} mode="center" requireCompanyApproval={() => requireCompanyApproval} onReview={(ids, action, note) => api.center.reviewReports(ids, action, note)} />
      </div>
    </div>
  );
}
