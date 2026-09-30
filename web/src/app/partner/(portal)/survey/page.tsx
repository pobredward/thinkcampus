"use client";

/**
 * 발주처 · 만족도 — 문항별 평균 · 분포 · 응답률 · 공개에 동의한 후기만 (이름은 가림)
 */

import { SurveyResultsView } from "@/components/survey/SurveyResultsView";
import { Empty, ErrorBox, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { useApi, useQuery } from "@/services";

export default function PartnerSurveyPage() {
  usePageTitle("만족도");
  const api = useApi();
  const { selectedRun } = usePartnerRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.partner.getSurveyResults(runId) : null), [api, runId]);

  if (!selectedRun) return <Loading />;
  return (
    <div>
      <PageTitle title="학부모 만족도" desc="학부모가 앱에서 답한 결과예요. 후기는 공개에 동의한 것만 이름을 가려서 보여 드려요." />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => void refetch()} />
      ) : !data ? (
        <Empty title="아직 만족도 조사를 하지 않았어요" />
      ) : (
        <div className="max-w-3xl">
          <SurveyResultsView results={data} showConsent={false} />
        </div>
      )}
    </div>
  );
}
