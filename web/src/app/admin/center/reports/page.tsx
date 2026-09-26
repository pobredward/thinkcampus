"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterSummary } from "@/hooks/useCenterSummary";
import { DEMO_CENTER_REPORT_QUEUE } from "@/lib/demoCenterOps";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_LABEL: Record<string, string> = {
  draft: "강사 작성 중",
  centerReviewed: "검수 대기",
  published: "학부모 공개",
};

export default function CenterReportsPage() {
  usePageTitle("리포트");
  const { selectedRun } = useCenterRun();
  const { role, active } = useDemoPortal();
  const isDemo = active && role === "center";
  const { data: summary, loading, error } = useCenterSummary(selectedRun?.id);
  const queue = isDemo ? DEMO_CENTER_REPORT_QUEUE : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-fg">회차 리포트</h2>
        <p className="mt-1 text-sm text-sub">
          반·회차별 검수 (대량 운영 시 반 필터와 함께 Phase C에서 목록 API 분리 예정)
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {summary && (
        <p className="rounded-lg border border-line bg-elev px-3 py-2 text-[13px] text-sub">
          검수 대기 <span className="font-bold text-fg">{summary.dashboard.reportsPendingReview}</span>건
        </p>
      )}

      {!isDemo && !loading && (
        <p className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
          리포트 목록은 데이터가 쌓이면 표시됩니다. 지금은 홈·검수 대기 건수만 집계합니다.
        </p>
      )}

      {isDemo && queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-fg">
                    {r.studentName} · {r.sessionNumber}회차
                  </p>
                  <p className="text-sm text-sub">{r.instructorName} · {r.submittedAt}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-line px-2 py-1 text-[11px] font-semibold text-sub">
                  {STATUS_LABEL[r.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
