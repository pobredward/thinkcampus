"use client";

/**
 * 수업 안내 목록 — 한 줄에 하나씩, 제목만 (부제·아이콘 없이 깔끔하게)
 * 줄 하나 = 독립된 안내 페이지 하나 (/main/program/[id]/guide/<항목>)
 * 규정·지침에는 "필독" 배지가 붙는다.
 */

import { GUIDE_SECTIONS, type GuideSection } from "@/data/programGuide";

export function GuideMenu({
  sections,
  onOpen,
}: {
  sections: GuideSection[];
  onOpen: (section: GuideSection) => void;
}) {
  const items = GUIDE_SECTIONS.filter((s) => sections.includes(s.id));

  return (
    <ul className="overflow-hidden rounded-[18px] border border-line bg-card">
      {items.map((s, i) => (
        <li key={s.id} className={i > 0 ? "border-t border-line" : ""}>
          <MenuRow label={s.label} badge={s.badge} onClick={() => onOpen(s.id)} />
        </li>
      ))}
    </ul>
  );
}

/** 안내 한 줄 (버튼) — 다른 곳에서도 같은 모양으로 쓴다 */
export function MenuRow({
  label,
  badge,
  onClick,
}: {
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={badge ? `${label} · ${badge}` : label}
      onClick={onClick}
      className="tap flex w-full items-center gap-3 px-5 py-4 text-left transition-colors active:bg-elev"
    >
      <span className="min-w-0 flex-1 text-[18px] font-bold leading-[26px] text-fg">{label}</span>
      {badge && (
        <span className="shrink-0 rounded-md border border-gold-border bg-gold-light px-2 py-[2px] text-[14px] font-bold tracking-[0.02em] text-gold">
          {badge}
        </span>
      )}
      <span aria-hidden="true" className="shrink-0 text-[22px] leading-none text-gold">
        ›
      </span>
    </button>
  );
}
