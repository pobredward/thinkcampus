"use client";

/**
 * 발주처 · 수업 — 회차별 카드: 날짜 · 시간(반) · 주제 · 강사 · 완료/오늘/예정 · 출석
 * 눌러 펼치면 수업 내용(목표 · 흐름 · 준비물). 예정 회차도 내용이 보여 "다음 수업이 무엇인지" 알 수 있다.
 */

import { dayLabel, LessonBody, LessonStatus, rateText } from "@/components/partner/parts";
import { Empty, ErrorBox, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { useApi, useQuery } from "@/services";

export default function PartnerLessonsPage() {
  usePageTitle("수업");
  const api = useApi();
  const { selectedRun } = usePartnerRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.partner.listLessons(runId) : null), [api, runId]);

  if (!selectedRun) return <Loading />;
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  const lessons = data ?? [];
  const firstOpen = lessons.find((l) => l.status !== "done")?.sessionNumber;

  return (
    <div>
      <PageTitle title="회차별 수업" desc={`${selectedRun.title} · 총 ${lessons.length}회`} />
      {lessons.length === 0 ? (
        <Empty title="아직 회차가 없어요" />
      ) : (
        <ol className="flex flex-col gap-3">
          {lessons.map((l) => {
            const recorded = l.attendance.present + l.attendance.late + l.attendance.absent;
            return (
              <li key={l.sessionNumber}>
                <details open={l.sessionNumber === firstOpen} className="group rounded-[18px] border border-line bg-card px-4 py-4 md:px-5" data-testid="partner-lesson">
                  <summary className="tap cursor-pointer list-none">
                    <div className="flex flex-wrap items-center gap-2">
                      <LessonStatus status={l.status} />
                      <span className="text-[15px] text-sub">
                        {dayLabel(l.date)} · {l.slots.join(" / ")}
                      </span>
                      <span className="ml-auto text-[15px] text-fg2">
                        {recorded > 0 ? (
                          <>
                            출석 <b className="text-fg">{l.attendance.present + l.attendance.late}</b>/{l.attendance.enrolled}명 · {rateText(l.attendance.rate)}
                          </>
                        ) : (
                          `대상 ${l.attendance.enrolled}명`
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-[18px] font-bold text-fg">
                      {l.sessionNumber}회차 · {l.topic}
                    </p>
                    <p className="mt-1 text-[14px] text-sub">
                      강사 {l.instructors.map((i) => i.name).join(", ")}
                      <span className="ml-2 font-semibold text-gold group-open:hidden">내용 보기</span>
                    </p>
                  </summary>
                  <div className="mt-4 border-t border-line pt-4">
                    <LessonBody l={l} />
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
