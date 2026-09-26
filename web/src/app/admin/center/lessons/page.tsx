"use client";

import { useMemo, useRef, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterSchedule } from "@/hooks/useCenterSchedule";
import { useCenterSummary } from "@/hooks/useCenterSummary";
import { centerStaffBase } from "@/lib/staffAppNav";
import { CenterRotationBoard } from "@/components/admin/center/CenterRotationBoard";
import { CenterSectionChips } from "@/components/admin/center/CenterSectionChips";
import { buildDemoScheduleDates } from "@/lib/demoCenterScale";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useCenterScope } from "@/providers/CenterScopeProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

function getTodayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function parseDateMeta(dateStr: string, idx: number, todayStr: string) {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const dayOfWeek = ["일", "월", "화", "수", "목", "금", "토"][dateObj.getUTCDay()];
    return {
      label: `${idx + 1}회차`,
      display: `${m}.${d} (${dayOfWeek})`,
      isToday: dateStr === todayStr,
    };
  } catch {
    return {
      label: `${idx + 1}회차`,
      display: dateStr,
      isToday: dateStr === todayStr,
    };
  }
}

export default function CenterLessonsPage() {
  usePageTitle("수업 로테이션");
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const base = centerStaffBase(pathname, active && role === "center");
  const { selectedRun } = useCenterRun();
  const { scheduleDate, setScheduleDate, sectionId, setSectionId } = useCenterScope();
  const { data: summary } = useCenterSummary(selectedRun?.id);
  const { days, loading, error } = useCenterSchedule(selectedRun?.id, scheduleDate);

  const todayStr = getTodayKst();

  // 운영 건의 모든 수업 날짜 목록
  const allDates = useMemo(() => {
    if (summary?.scheduleDates && summary.scheduleDates.length > 0) {
      return summary.scheduleDates;
    }
    return buildDemoScheduleDates(todayStr);
  }, [summary?.scheduleDates, todayStr]);

  // 선택된 날짜 버튼으로 자동 스크롤
  const activeDateRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (activeDateRef.current) {
      activeDateRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [scheduleDate]);

  return (
    <div className="space-y-4">
      {/* 상단 타이틀 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[19px] font-bold text-fg">수업 로테이션 시간표</h2>
          <p className="text-[12px] text-sub">날짜별 전 반 동시 로테이션 현황 및 출결 관리</p>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1 text-[11px] text-sub">
            <span className="sr-only">날짜 직접 선택</span>
            <input
              type="date"
              className="rounded-lg border border-line bg-elev px-2 py-1 text-[12px] font-medium text-fg"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* 🌟 모든 날짜 버튼 바 (가로 스크롤 리본) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[12px] font-bold text-fg">수업 일정 (전체 회차)</span>
          <span className="text-[11px] text-sub">총 {allDates.length}회차</span>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 pt-0.5 scrollbar-none">
          {allDates.map((dStr, idx) => {
            const isSelected = dStr === scheduleDate;
            const meta = parseDateMeta(dStr, idx, todayStr);

            return (
              <button
                key={dStr}
                ref={isSelected ? activeDateRef : null}
                type="button"
                onClick={() => setScheduleDate(dStr)}
                className={`tap flex shrink-0 flex-col items-center justify-center rounded-xl border px-3 py-2 text-center transition-all ${
                  isSelected
                    ? "border-gold bg-gold/15 text-gold shadow-sm ring-1 ring-gold"
                    : "border-line bg-card text-sub hover:border-gold/50 hover:bg-elev"
                }`}
                style={{ minWidth: "82px" }}
              >
                <div className="flex items-center gap-1">
                  <span className={`text-[11px] font-bold ${isSelected ? "text-gold" : "text-sub"}`}>
                    {meta.label}
                  </span>
                  {meta.isToday && (
                    <span className="rounded bg-gold px-1 py-0.2 text-[9px] font-extrabold text-white">
                      오늘
                    </span>
                  )}
                </div>
                <span className={`mt-0.5 text-[13px] font-semibold ${isSelected ? "text-fg" : "text-fg/85"}`}>
                  {meta.display}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 인라인 반 필터 칩 */}
      {summary && summary.sections.length > 0 && (
        <div className="space-y-1">
          <CenterSectionChips
            sections={summary.sections}
            value={sectionId}
            onChange={setSectionId}
            totalStudents={summary.dashboard.totalStudents}
          />
        </div>
      )}

      {/* 로딩 / 에러 */}
      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* 🌟 시간표 표 (Rotation Schedule Table) */}
      {!loading && (
        <CenterRotationBoard
          days={days}
          basePath={base}
          sectionFilter={sectionId}
          sections={summary?.sections}
        />
      )}
    </div>
  );
}
