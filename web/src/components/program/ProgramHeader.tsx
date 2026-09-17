"use client";

/**
 * 프로그램 화면 공통 파란 헤더
 *   mode="overview" : ← 홈 · 운영 정보(요일·시간·장소)
 *   mode="report"   : ← 뒤로 · "종합 학습 리포트"
 */

export function ProgramHeader({
  mode,
  studentName,
  programTitle,
  meta,
  onBack,
}: {
  mode: "overview" | "report";
  studentName: string;
  programTitle: string;
  meta?: string;
  onBack: () => void;
}) {
  return (
    <header className="no-print bg-brand px-5 pb-5" style={{ paddingTop: "calc(var(--sat) + 10px)" }}>
      <div className="mb-3">
        <button type="button" onClick={onBack} className="tap -ml-1 py-1 pr-2 text-[16px] font-medium text-blue-100">
          {mode === "overview" ? "← 홈" : "← 뒤로"}
        </button>
      </div>
      {studentName && <p className="mb-1 text-[15px] text-blue-100">{studentName} 학생</p>}
      <h1 className="line-clamp-2 text-[22px] font-extrabold leading-[30px] text-white">
        {mode === "report" ? "종합 학습 리포트" : programTitle}
      </h1>
      {mode === "report" ? (
        <p className="mt-1 truncate text-[15px] text-blue-100">{programTitle}</p>
      ) : (
        meta && <p className="mt-1 whitespace-pre-line text-[15px] leading-[23px] text-blue-100">{meta}</p>
      )}
    </header>
  );
}
