"use client";

/**
 * 회사 · 리포트 — 운영 건별 승인 정책 + 회사 승인 대기 리포트
 */

import { useMemo } from "react";
import { ReportReviewList } from "@/components/staff/ReportReview";
import { Badge, Button, Empty, ErrorBox, Loading, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery } from "@/services";

export default function CompanyPolicyPage() {
  usePageTitle("리포트");
  const api = useApi();
  const toast = useToast();
  const { data: runs, loading: runsLoading, error: runsError, refetch } = useQuery(() => api.company.listRuns(), [api]);
  const { data: reports, loading: reportsLoading } = useQuery(() => api.company.listReports({ status: "reviewed" }), [api]);
  const policy = useMutation((runId: string, v: boolean) => api.company.updateRunPolicy(runId, { requireCompanyApproval: v }));
  const policyOf = useMemo(() => new Map((runs ?? []).map((r) => [r.id, r.reportPolicy.requireCompanyApproval])), [runs]);

  if (runsLoading && !runs) return <Loading />;
  if (runsError) return <ErrorBox message={runsError} onRetry={() => void refetch()} />;

  const openRuns = (runs ?? []).filter((r) => r.status === "active" || r.status === "scheduled");

  return (
    <div>
      <PageTitle title="리포트" desc="회차 리포트는 강사 작성 → 센터 검수 → (회사 승인) → 학부모 공개 순으로 흘러요." />

      <SectionLabel right={<Badge tone={reports && reports.length > 0 ? "gold" : "neutral"}>{reports?.length ?? 0}건</Badge>}>회사 승인 대기</SectionLabel>
      {reportsLoading && !reports ? (
        <Loading />
      ) : (
        <ReportReviewList rows={reports ?? []} mode="company" requireCompanyApproval={(id) => policyOf.get(id) ?? false} onReview={(ids, action, note) => api.company.reviewReports(ids, action, note)} />
      )}

      <SectionLabel>운영 건별 정책</SectionLabel>
      {openRuns.length === 0 ? (
        <Empty title="운영 중인 건이 없어요" />
      ) : (
        <ul className="flex flex-col gap-2">
          {openRuns.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-bold text-fg">{r.title}</p>
                <p className="text-[14px] text-sub">
                  {r.contractCode} · {r.reportPolicy.requireCompanyApproval ? "회사 승인 후 공개" : "센터 검수 후 바로 공개"}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={policy.pending}
                onClick={() =>
                  void policy
                    .run(r.id, !r.reportPolicy.requireCompanyApproval)
                    .then(() => toast.show("정책을 바꿨어요"))
                    .catch((e: Error) => toast.show(e.message))
                }
              >
                {r.reportPolicy.requireCompanyApproval ? "승인 끄기" : "승인 켜기"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
