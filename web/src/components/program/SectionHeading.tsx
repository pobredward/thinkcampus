"use client";

/**
 * 섹션 제목 — 위에 짧은 골드 선을 둬서 아래 내용과 확실히 구분된다
 * (수업 안내 / 회차별 수업 처럼 화면을 나누는 큰 제목에만 쓴다)
 */

export function SectionHeading({
  children,
  right,
  id,
}: {
  children: React.ReactNode;
  /** 오른쪽 보조 정보 (예: 총 6회 · 진행 3회) */
  right?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="px-1 pb-3">
      <span aria-hidden="true" className="mb-2 block h-[3px] w-7 rounded-full bg-gold" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 id={id} className="text-[22px] font-extrabold leading-[30px] tracking-[-0.01em] text-fg">
          {children}
        </h2>
        {right && <p className="text-[16px] font-semibold text-sub">{right}</p>}
      </div>
    </div>
  );
}
