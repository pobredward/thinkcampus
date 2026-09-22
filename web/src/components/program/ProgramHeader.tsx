"use client";

/**
 * 프로그램 화면 공통 헤더 (바탕과 같은 색 · 골드 포인트)
 *   맨 위 상단 경로: 홈 › 프로그램 (› 종합 리포트) — 앞 단계를 누르면 돌아간다
 *   mode="overview" : 학생 · 프로그램명 (+ 배지·한 줄 메모)
 *   mode="report"   : "종합 학습 리포트" · 프로그램명
 */

import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

export function ProgramHeader({
  mode,
  studentName,
  programTitle,
  badge,
  note,
  crumbs,
}: {
  mode: "overview" | "report";
  studentName: string;
  programTitle: string;
  /** 제목 위 작은 배지 (예: 수강 예정) */
  badge?: string;
  /** 제목 아래 한 줄 (예: 첫 수업 D-79) */
  note?: string;
  /** 상단 경로 */
  crumbs: Crumb[];
}) {
  return (
    <header className="no-print px-5 pb-4" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
      <Breadcrumbs items={crumbs} className="mb-1" />
      <div className="flex flex-wrap items-center gap-2">
        {badge && (
          <span className="rounded-md border border-gold-dim bg-gold-light px-[9px] py-[2px] text-[14px] font-bold text-gold">
            {badge}
          </span>
        )}
        {studentName && <p className="text-[15px] text-sub">{studentName} 학생</p>}
      </div>
      <h1 className="mt-2 line-clamp-2 text-[24px] font-extrabold leading-[33px] tracking-[-0.01em] text-fg">
        {mode === "report" ? "종합 학습 리포트" : programTitle}
      </h1>
      {mode === "report" ? (
        <p className="mt-2 truncate text-[15px] text-sub">{programTitle}</p>
      ) : (
        note && <p className="mt-2 text-[15px] font-semibold text-gold">{note}</p>
      )}
    </header>
  );
}
