"use client";

/**
 * 홈 상단 오른쪽 "자녀 전환" 버튼 + 선택 시트 (자녀 2명 이상일 때만 사용)
 *
 * 형제자매는 성이 같은 경우가 많아서 아바타에는 이름(성 제외) 첫 글자를 쓰고,
 * 자녀마다 색을 달리해 한눈에 구분되게 한다.
 */

import { useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { Child } from "@/hooks/useChildren";

const AVATAR_COLORS = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#db2777"];

export function childAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** 김민준 → 민, 이서 → 서, 민 → 민 */
export function childInitial(name: string): string {
  const n = name.trim();
  if (n.length >= 2) return n.charAt(1);
  return n.charAt(0);
}

function ChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className={className}>
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckCircle({ on }: { on: boolean }) {
  return on ? (
    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand">
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : (
    <span className="h-[22px] w-[22px] shrink-0 rounded-full border-[1.5px] border-gray-300" />
  );
}

export function ChildSwitcher({
  items,
  selectedIndex,
  onSelect,
}: {
  items: Child[];
  selectedIndex: number;
  onSelect: (studentId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = items[selectedIndex];
  if (!current || items.length < 2) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`자녀 전환, 현재 ${current.studentName}`}
        className="tap flex shrink-0 items-center gap-[6px] rounded-full border border-white/30 bg-white/15 py-1 pl-1 pr-[10px]"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[15px] font-extrabold"
          style={{ color: childAvatarColor(selectedIndex) }}
        >
          {childInitial(current.studentName)}
        </span>
        <span className="max-w-[84px] truncate text-[15px] font-bold text-white">{current.studentName}</span>
        <ChevronDown className="text-blue-100" />
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="자녀 선택">
        <p className="-mt-2 mb-4 text-[15px] text-gray-500">
          연결된 자녀 {items.length}명 · 홈에 표시할 자녀를 선택하세요.
        </p>
        <ul role="listbox" aria-label="자녀 목록" className="flex flex-col gap-2 pb-4">
          {items.map((c, i) => {
            const isSel = i === selectedIndex;
            const meta = [c.campusName, c.relation].filter(Boolean).join(" · ");
            return (
              <li key={c.studentId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  onClick={() => {
                    onSelect(c.studentId);
                    setOpen(false);
                  }}
                  className={`tap flex w-full items-center gap-3 rounded-[14px] border-[1.5px] p-[14px] text-left ${
                    isSel ? "border-brand bg-brand-light" : "border-gray-200 bg-white"
                  }`}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] font-extrabold text-white"
                    style={{ backgroundColor: childAvatarColor(i) }}
                  >
                    {childInitial(c.studentName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-bold text-gray-900">
                      {c.studentName} <span className="text-[15px] font-medium text-gray-500">학생</span>
                    </span>
                    {meta && <span className="mt-[2px] block truncate text-[14px] text-gray-500">{meta}</span>}
                  </span>
                  <CheckCircle on={isSel} />
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}
