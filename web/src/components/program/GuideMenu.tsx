"use client";

/**
 * 프로그램 안내 버튼 묶음 (2열) — 수강 예정 첫 화면 · 수강 중 프로그램 화면에서 사용
 * 버튼 하나 = 독립된 안내 페이지 하나 (/main/program/[id]/guide/<항목>)
 */

import { GUIDE_SECTIONS, type GuideSection } from "@/data/programGuide";

export function GuideMenu({
  sections,
  onOpen,
  noticeCount,
  onContact,
}: {
  sections: GuideSection[];
  onOpen: (section: GuideSection) => void;
  /** 공지사항 버튼에 "N건" 표시 */
  noticeCount?: number;
  /** 있으면 마지막 칸에 "문의하기" 버튼 */
  onContact?: () => void;
}) {
  const items = GUIDE_SECTIONS.filter((s) => sections.includes(s.id));

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((s) => {
        const warn = s.id === "rules";
        const desc = s.id === "notices" && noticeCount ? `공지 ${noticeCount}건` : s.desc;
        return (
          <Tile
            key={s.id}
            icon={s.icon}
            label={s.label}
            desc={desc}
            warn={warn}
            onClick={() => onOpen(s.id)}
          />
        );
      })}
      {onContact && <Tile icon="🙋" label="문의하기" desc="챗봇·전화 상담" onClick={onContact} />}
    </div>
  );
}

function Tile({
  icon,
  label,
  desc,
  warn,
  onClick,
}: {
  icon: string;
  label: string;
  desc: string;
  warn?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`tap flex min-h-[76px] items-center gap-[10px] rounded-[18px] border px-3 py-3 text-left shadow-[0_1px_4px_rgba(17,24,39,0.04)] ${
        warn ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <span aria-hidden="true" className="shrink-0 text-[26px] leading-none">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[16px] font-extrabold leading-[22px] ${warn ? "text-red-700" : "text-gray-900"}`}>
          {label}
        </span>
        <span className={`mt-[2px] block text-[14px] leading-[19px] ${warn ? "font-semibold text-red-600" : "text-gray-500"}`}>
          {desc}
        </span>
      </span>
    </button>
  );
}
