"use client";

/**
 * 센터 · 수업 — 날짜를 고르면 그날의 시간대별 반 카드
 *   [날짜 리본: 9.5 · 9.19 · 오늘 10.3 · 10.17 …]
 *   10:00–12:00
 *     1반 · 박지훈 · 출결 12/12 · 리포트 12/12   [출결]
 *     2반 · 이수민 · 출결 0/12                    [출결 입력]
 *   13:00–15:00 …
 * 넓은 표 없이 카드만 — 폰에서도 그대로.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Badge, Button, Empty, ErrorBox, fmtDate, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { todayKey } from "@/lib/dates";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useApi, useQuery, type CenterScheduleDay, type CenterScheduleSession } from "@/services";

function pickDefaultDate(days: CenterScheduleDay[], today: string): string | null {
  if (days.length === 0) return null;
  return days.find((d) => d.date >= today)?.date ?? days[days.length - 1].date;
}

function SessionCard({ s, date, showLocation }: { s: CenterScheduleSession; date: string; showLocation: boolean }) {
  const done = s.enrolledCount > 0 && s.recordedCount >= s.enrolledCount;
  const past = date < todayKey();
  const attendanceTone = done ? "gold" : s.recordedCount > 0 ? "late" : past ? "danger" : "neutral";
  return (
    <li className="rounded-[16px] border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[18px] font-extrabold text-fg">{s.sectionLabel}</p>
          <p className="mt-[2px] text-[15px] text-fg2">{s.instructorName ?? <span className="text-danger">강사 미배정</span>}</p>
          {showLocation && <p className="mt-[2px] text-[14px] text-sub">{s.location}</p>}
        </div>
        {s.status === "cancelled" ? (
          <Badge tone="dim">휴강</Badge>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <Badge tone={attendanceTone}>
              출결 {s.recordedCount}/{s.enrolledCount}
            </Badge>
            <Badge tone={s.reportedCount >= s.enrolledCount && s.enrolledCount > 0 ? "gold" : "neutral"}>
              리포트 {s.reportedCount}/{s.enrolledCount}
            </Badge>
          </div>
        )}
      </div>
      {s.status !== "cancelled" && (
        <div className="mt-3 flex gap-2">
          <Button href={`/admin/center/attendance?session=${encodeURIComponent(s.id)}`} variant={done ? "secondary" : "primary"} className="flex-1">
            {done ? "출결 보기" : s.recordedCount > 0 ? "출결 이어서 입력" : "출결 입력"}
          </Button>
          <Button href={`/admin/center/reports?session=${encodeURIComponent(s.id)}`} variant="secondary" className="flex-1">
            리포트
          </Button>
        </div>
      )}
    </li>
  );
}

export default function CenterLessonsPage() {
  usePageTitle("수업");
  const api = useApi();
  const router = useRouter();
  const sp = useSearchParams();
  const { selectedRun, runsLoading } = useCenterRun();
  const runId = selectedRun?.id ?? null;
  const { data: days, loading, error, refetch } = useQuery(() => (runId ? api.center.listSchedule(runId) : null), [api, runId]);
  const today = todayKey();

  const requested = sp.get("date");
  const selectedDate = useMemo(() => {
    if (!days) return null;
    if (requested && days.some((d) => d.date === requested)) return requested;
    return pickDefaultDate(days, today);
  }, [days, requested, today]);

  useEffect(() => {
    if (days && selectedDate && requested !== selectedDate) router.replace(`/admin/center/lessons?date=${selectedDate}`, { scroll: false });
  }, [days, selectedDate, requested, router]);

  if (runsLoading || (loading && !days)) return <Loading label="시간표를 불러오는 중..." />;
  if (!selectedRun) return <Empty title="운영 건을 먼저 골라 주세요" />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!days || days.length === 0) return <Empty title="회차가 아직 없어요" desc="회사에서 운영 건 일정을 만들면 여기에 보여요." />;

  const day = days.find((d) => d.date === selectedDate) ?? days[0];
  const total = day.slots.reduce((a, s) => a + s.sessions.length, 0);
  const recorded = day.slots.reduce((a, s) => a + s.sessions.filter((x) => x.enrolledCount > 0 && x.recordedCount >= x.enrolledCount).length, 0);
  // 모든 반이 같은 장소면 위에 한 번만
  const locations = new Set(day.slots.flatMap((sl) => sl.sessions.map((x) => x.location)));
  const oneLocation = locations.size === 1 ? [...locations][0] : null;

  return (
    <div>
      <PageTitle title="수업" desc={`${selectedRun.sections.length}개 반 · 날짜를 고르면 반별 출결 · 리포트가 보여요`} />

      {/* 날짜 리본 */}
      <div role="tablist" aria-label="수업 날짜" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
        {days.map((d) => {
          const on = d.date === day.date;
          const isToday = d.date === today;
          const label = `${Number(d.date.slice(5, 7))}.${Number(d.date.slice(8, 10))}`;
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => router.replace(`/admin/center/lessons?date=${d.date}`, { scroll: false })}
              className={`tap flex h-[52px] shrink-0 flex-col items-center justify-center rounded-[14px] border px-3 ${
                on ? "border-gold bg-gold-light text-gold" : "border-line bg-card text-fg2"
              }`}
            >
              <span className="text-[14px] font-semibold">{d.sessionNumber}회차</span>
              <span className={`text-[15px] font-bold ${isToday ? "underline underline-offset-2" : ""}`}>{isToday ? "오늘" : label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="text-[19px] font-extrabold text-fg">
          {fmtDate(day.date)} · {day.sessionNumber}회차
        </h2>
        <span className="text-[14px] text-sub">
          출결 완료 {recorded}/{total}반
        </span>
      </div>
      <p className="mt-1 text-[15px] text-sub">
        {day.slots[0]?.sessions[0]?.topic}
        {oneLocation ? ` · ${oneLocation}` : ""}
      </p>

      {day.slots.map((slot) => (
        <section key={`${slot.startTime}-${slot.endTime}`} className="mt-4" aria-label={`${slot.startTime}–${slot.endTime}`}>
          <p className="mb-2 text-[15px] font-bold text-gold">
            {slot.startTime}–{slot.endTime}
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {slot.sessions.map((s) => (
              <SessionCard key={s.id} s={s} date={day.date} showLocation={!oneLocation} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
