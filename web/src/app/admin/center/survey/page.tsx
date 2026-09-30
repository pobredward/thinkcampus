"use client";

/**
 * 센터 · 만족도 조사 결과 (지금 보고 있는 운영 건)
 *   후기는 전부 보이고, 공개 동의 여부를 함께 표시한다 (발주처 화면 · 보고서에는 공개 동의한 것만)
 */

import Link from "next/link";
import { SurveyResultsView } from "@/components/survey/SurveyResultsView";
import { Empty, ErrorBox, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useApi, useQuery } from "@/services";

export default function CenterSurveyPage() {
  usePageTitle("만족도 조사");
  const api = useApi();
  const { selectedRun } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.center.getSurveyResults(runId) : null), [api, runId]);

  if (!selectedRun) return <Loading />;
  return (
    <div>
      <Link href="/admin/center/more" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
        ‹ 더보기
      </Link>
      <PageTitle title="만족도 조사 결과" desc={selectedRun.title} />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => void refetch()} />
      ) : !data ? (
        <Empty title="이 운영 건에는 만족도 조사가 없어요" desc="통합 관리자가 조사를 열면 학부모 앱 홈에 참여 카드가 떠요." />
      ) : (
        <SurveyResultsView results={data} showConsent />
      )}
    </div>
  );
}
