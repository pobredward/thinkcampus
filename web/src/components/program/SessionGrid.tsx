"use client";

/**
 * 회차 버튼 — 한 줄에 3개, "N회차" 만 (날짜·시간·출결은 눌러서 회차 화면에서)
 * 상태는 색으로만: 끝난 회차 = 가라앉은 면 + ✓ · 다음 수업 = 골드 채움(잉크 글자) · 남은 회차 = 카드
 */

import { isDone, STATUS_LABEL, type DayItem } from "@/data/programView";

export function SessionGrid({
  items,
  next,
  onOpen,
}: {
  items: DayItem[];
  next: DayItem | null;
  onOpen: (item: DayItem) => void;
}) {
  return (
    <ol className="grid grid-cols-3 gap-[10px]">
      {items.map((d) => (
        <li key={d.key}>
          <SessionButton item={d} isNext={d === next} onOpen={() => onOpen(d)} />
        </li>
      ))}
    </ol>
  );
}

function SessionButton({ item, isNext, onOpen }: { item: DayItem; isNext: boolean; onOpen: () => void }) {
  const { session, status } = item;
  const done = isDone(status);
  const cancelled = status === "cancelled";
  const state = isNext ? "next" : done ? "done" : "later";

  const box =
    state === "next"
      ? "border-gold bg-gold text-ink"
      : state === "done"
        ? "border-line bg-card2 text-sub"
        : "border-line bg-card text-fg";

  return (
    <button
      type="button"
      onClick={onOpen}
      data-state={state}
      aria-label={`${session.sessionNumber}회차 ${session.topic}${isNext ? " · 다음 수업" : done ? " · 완료" : ""}`}
      className={`tap flex min-h-[68px] w-full flex-col items-center justify-center rounded-2xl border px-1 py-[10px] text-center transition active:translate-y-[1px] ${box}`}
    >
      <span className="text-[19px] font-extrabold leading-[26px] tracking-[-0.01em]">
        {session.sessionNumber}회차
      </span>
      {isNext ? (
        <span className="mt-[3px] text-[14px] font-bold leading-[18px] text-ink/75">다음 수업</span>
      ) : done ? (
        <span aria-hidden="true" className="mt-[3px] text-[14px] font-bold leading-[18px] text-faint">
          ✓
        </span>
      ) : cancelled ? (
        <span className="mt-[3px] text-[14px] font-semibold leading-[18px] text-faint">
          {STATUS_LABEL.cancelled}
        </span>
      ) : null}
    </button>
  );
}
