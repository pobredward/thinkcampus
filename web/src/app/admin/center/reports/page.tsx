"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterScreenData } from "@/hooks/useCenterScreenData";
import { Spinner } from "@/components/ui/Spinner";

const STATUS_LABEL: Record<string, string> = {
  draft: "강사 작성 중",
  centerReviewed: "검수 대기",
  published: "학부모 공개",
};

export default function CenterReportsPage() {
  usePageTitle("리포트");
  const { ops, loading, error, hasRun } = useCenterScreenData();
  const queue = ops?.reports ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-fg">회차 리포트</h2>
        <p className="mt-1 text-sm text-sub">강사 제출 → 센터 검수 → 학부모 앱 노출</p>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && hasRun && queue.length === 0 && (
        <p className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
          검수할 리포트가 없습니다.
        </p>
      )}

      {!loading && queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-fg">
                    {r.studentName} · {r.sessionNumber}회차
                  </p>
                  <p className="text-sm text-sub">
                    {r.instructorName ?? "—"}
                    {r.submittedAt ? ` · ${r.submittedAt}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                    r.status === "centerReviewed"
                      ? "bg-amber-500/10 text-amber-800"
                      : r.status === "published"
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-line text-sub"
                  }`}
                >
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              {r.status === "centerReviewed" && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="tap flex-1 rounded-lg bg-gold px-3 py-2 text-[13px] font-semibold text-paper"
                    disabled
                  >
                    승인 (Phase C)
                  </button>
                  <button
                    type="button"
                    className="tap flex-1 rounded-lg border border-line px-3 py-2 text-[13px] font-semibold text-sub"
                    disabled
                  >
                    반려
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
