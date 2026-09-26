"use client";

import { useEffect, useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRoster } from "@/hooks/useCenterRoster";
import { useCenterSummary } from "@/hooks/useCenterSummary";
import type { RosterGuardianFilter } from "@/lib/centerRoster";
import { CenterRosterList } from "@/components/admin/center/CenterRosterList";
import { CenterSectionChips } from "@/components/admin/center/CenterSectionChips";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useCenterScope } from "@/providers/CenterScopeProvider";
import { useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function CenterStudentsPage() {
  usePageTitle("학생");
  const searchParams = useSearchParams();
  const { selectedRun } = useCenterRun();
  const { sectionId, setSectionId, rosterQ, setRosterQ, guardianFilter, setGuardianFilter } =
    useCenterScope();
  const { data: summary } = useCenterSummary(selectedRun?.id);

  const [qInput, setQInput] = useState(rosterQ);
  useEffect(() => {
    setQInput(rosterQ);
  }, [rosterQ]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (qInput !== rosterQ) setRosterQ(qInput);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput, rosterQ, setRosterQ]);

  useEffect(() => {
    const g = searchParams.get("guardian") as RosterGuardianFilter | null;
    if (g === "unlinked" || g === "linked") {
      if (g !== guardianFilter) setGuardianFilter(g);
    }
  }, [searchParams, guardianFilter, setGuardianFilter]);

  const roster = useCenterRoster(selectedRun?.id, {
    sectionId,
    q: rosterQ,
    guardianFilter,
  });

  return (
    <div className="space-y-3.5">
      {/* 상단 타이틀 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[19px] font-bold text-fg">학생 명단</h2>
          <p className="text-[12px] text-sub">이름 검색 후 학부모 연락 및 초대코드 안내</p>
        </div>
        {summary && (
          <span className="text-[12px] font-medium text-sub">
            총 <strong className="text-fg">{summary.dashboard.totalStudents}</strong>명
          </span>
        )}
      </div>

      {/* 인라인 반 필터 */}
      {summary && summary.sections.length > 0 && (
        <CenterSectionChips
          sections={summary.sections}
          value={sectionId}
          onChange={setSectionId}
          totalStudents={summary.dashboard.totalStudents}
        />
      )}

      {/* 검색 & 보호자 연결 상태 필터 바 */}
      <div className="space-y-2">
        <input
          type="search"
          placeholder="학생 이름으로 검색 (예: 김지우)"
          className="w-full rounded-xl border border-line bg-elev px-3.5 py-2.5 text-[14px] placeholder:text-faint focus:border-gold focus:outline-none"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(["all", "unlinked", "linked"] as RosterGuardianFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setGuardianFilter(f)}
                className={`tap rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  guardianFilter === f
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-line bg-elev text-sub"
                }`}
              >
                {f === "all" ? "전체" : f === "unlinked" ? "보호자 미연결" : "보호자 연결됨"}
              </button>
            ))}
          </div>
          {guardianFilter === "unlinked" && summary && (
            <span className="text-[11px] font-medium text-amber-800">
              미연결 {summary.dashboard.studentsWithoutGuardian}명
            </span>
          )}
        </div>
      </div>

      {/* 목록 본문 */}
      {roster.loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {roster.error && <p className="text-sm text-red-600">{roster.error}</p>}
      {!roster.loading && (
        <CenterRosterList
          rows={roster.rows}
          hasMore={roster.hasMore}
          loadingMore={roster.loadingMore}
          onLoadMore={roster.loadMore}
        />
      )}
    </div>
  );
}
