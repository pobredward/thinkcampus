"use client";

import Link from "next/link";
import { Badge, fmtDate } from "@/components/staff/ui";
import { todayKey } from "@/lib/dates";
import type { InstructorSessionDto } from "@/services";

/** 강사 회차 카드 — 오늘 · 앞으로 · 지난 회차에 같은 모양. 출결 · 리포트 칸은 오늘과 지난 회차에만 */
export function InstructorSessionCard({ s, showDate = true }: { s: InstructorSessionDto; showDate?: boolean }) {
  const today = todayKey();
  const past = s.scheduledDate < today;
  const isToday = s.scheduledDate === today;
  const attDone = s.enrolledCount > 0 && s.recordedCount >= s.enrolledCount;
  const repDone = s.enrolledCount > 0 && s.reportedCount >= s.enrolledCount;
  return (
    <Link
      href={`/instructor/session/${encodeURIComponent(s.id)}`}
      data-recorded={s.recordedCount}
      className={`tap block rounded-[18px] border p-4 hover:border-gold-dim ${isToday ? "border-gold-dim bg-card" : "border-line bg-card"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {showDate && (
            <p className="text-[14px] font-bold text-gold">
              {isToday ? "오늘" : fmtDate(s.scheduledDate)} · {s.startTime}–{s.endTime}
            </p>
          )}
          {!showDate && (
            <p className="text-[14px] font-bold text-gold">
              {s.startTime}–{s.endTime}
            </p>
          )}
          <p className="mt-[2px] text-[18px] font-extrabold leading-[26px] text-fg">
            {s.sectionLabel} · {s.sessionNumber}회차
          </p>
          <p className="mt-[2px] truncate text-[15px] text-fg2">{s.topic}</p>
          <p className="mt-[2px] truncate text-[14px] text-sub">{s.location}</p>
        </div>
        {s.status === "cancelled" ? (
          <Badge tone="dim">휴강</Badge>
        ) : !past && !isToday ? null : (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone={attDone ? "gold" : s.recordedCount > 0 ? "late" : past || isToday ? "danger" : "neutral"}>
              출결 {s.recordedCount}/{s.enrolledCount}
            </Badge>
            <Badge tone={repDone ? "gold" : "neutral"}>
              리포트 {s.reportedCount}/{s.enrolledCount}
            </Badge>
          </div>
        )}
      </div>
    </Link>
  );
}
