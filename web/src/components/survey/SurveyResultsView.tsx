"use client";

/**
 * 만족도 조사 결과 — 센터(후기 전부 · 공개 동의 표시) · 발주처 담당자(공개 동의한 후기만) 공통
 *   요약: 응답 n / 대상 m (응답률) · 전체 평균 · 기간
 *   문항별: 평균 막대 + 1~5점 분포
 *   후기: 최근순
 */

import { chatStamp } from "@/lib/chatTime";
import type { SurveyResultsDto } from "@/services/types";

function monthDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function surveyRate(r: Pick<SurveyResultsDto, "responses" | "eligible">): number | null {
  return r.eligible > 0 ? Math.round((r.responses / r.eligible) * 100) : null;
}

export function SurveyResultsView({ results, showConsent }: { results: SurveyResultsDto; showConsent: boolean }) {
  const rate = surveyRate(results);
  const period = `${monthDay(results.opensAt)} ~ ${monthDay(results.closesAt)}`;
  const statusLabel = results.status === "open" ? "진행 중" : results.status === "closed" ? "마감" : "시작 전";
  return (
    <div className="flex flex-col gap-4" data-testid="survey-results">
      <div className="rounded-[18px] border border-gold-dim bg-card p-4">
        <p className="text-[14px] font-bold text-gold">
          {statusLabel} · {period}
        </p>
        <p className="mt-1 text-[17px] font-bold text-fg">{results.title}</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[14px] font-semibold text-sub">전체 평균</p>
            <p className="mt-1 text-[28px] font-extrabold leading-[34px] text-gold">
              {results.overallAvg != null ? results.overallAvg.toFixed(2) : "-"}
              <span className="ml-1 text-[15px] font-semibold text-sub">/ 5</span>
            </p>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-sub">응답</p>
            <p className="mt-1 text-[28px] font-extrabold leading-[34px] text-fg">
              {results.responses}
              <span className="ml-1 text-[15px] font-semibold text-sub">
                / {results.eligible}명{rate != null ? ` (${rate}%)` : ""}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-line bg-card p-4">
        <p className="text-[16px] font-bold text-fg">문항별 평균</p>
        <ul className="mt-3 flex flex-col gap-4">
          {results.items.map((it) => {
            const total = it.distribution.reduce((a, b) => a + b, 0);
            return (
              <li key={it.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[15px] font-bold text-fg">{it.label}</p>
                  <p className="text-[16px] font-extrabold text-gold">{it.avg != null ? it.avg.toFixed(2) : "-"}</p>
                </div>
                <p className="mt-[2px] text-[14px] leading-[20px] text-sub">{it.question}</p>
                <div className="mt-2 h-[10px] overflow-hidden rounded-full bg-line2" aria-hidden="true">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${it.avg != null ? (it.avg / 5) * 100 : 0}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1 text-center" aria-label={`${it.label} 점수 분포`}>
                  {it.distribution.map((n, i) => (
                    <div key={i} className="rounded-[8px] bg-elev px-1 py-1">
                      <p className="text-[14px] text-faint">{i + 1}점</p>
                      <p className="text-[15px] font-bold text-fg2">{n}</p>
                      {total > 0 && <p className="text-[14px] text-faint">{Math.round((n / total) * 100)}%</p>}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-[18px] border border-line bg-card p-4">
        <p className="text-[16px] font-bold text-fg">
          학부모 후기 <span className="font-semibold text-sub">{results.reviews.length}건</span>
        </p>
        {!showConsent && <p className="mt-1 text-[14px] text-sub">공개에 동의한 후기만 보여요.</p>}
        {results.reviews.length === 0 ? (
          <p className="mt-3 text-[15px] text-sub">아직 후기가 없어요.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {results.reviews.map((r) => (
              <li key={r.id} className="rounded-[12px] border border-line bg-elev px-4 py-3">
                <p className="whitespace-pre-wrap text-[15px] leading-[23px] text-fg">{r.text}</p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-sub">
                  {r.studentLabel} · {chatStamp(r.submittedAt)}
                  {showConsent && (
                    <span className={`rounded-md border px-2 py-[1px] text-[14px] font-bold ${r.consentPublic ? "border-gold-border bg-gold-light text-gold" : "border-line2 bg-card2 text-faint"}`}>
                      {r.consentPublic ? "공개 동의" : "비공개"}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
