"use client";

/**
 * 발주처 포털 공통 조각 — 컴퓨터 화면에서 넓게 (표 · 가로 막대), 폰에서는 세로로
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/staff/ui";
import type { PartnerAttendanceRow, PartnerLesson } from "@/services/types";

export function Kpi({ label, value, unit, hint, tone = "fg", href }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode; tone?: "fg" | "gold" | "danger" | "late"; href?: string }) {
  const color = tone === "gold" ? "text-gold" : tone === "danger" ? "text-danger" : tone === "late" ? "text-late" : "text-fg";
  const body = (
    <>
      <p className="text-[14px] font-semibold text-sub">{label}</p>
      <p className={`mt-1 text-[28px] font-extrabold leading-[34px] ${color}`}>
        {value}
        {unit && <span className="ml-1 text-[15px] font-semibold text-sub">{unit}</span>}
      </p>
      {hint && <div className="mt-1 text-[14px] leading-[20px] text-sub">{hint}</div>}
    </>
  );
  const cls = "block rounded-[18px] border border-line bg-card p-4 md:p-5";
  return href ? (
    <Link href={href} className={`tap ${cls} hover:border-gold-dim`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function rateText(rate: number | null): string {
  return rate == null ? "-" : `${rate.toFixed(rate % 1 === 0 ? 0 : 1)}%`;
}

export function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}.${d} (${wd})`;
}

export function LessonStatus({ status }: { status: PartnerLesson["status"] }) {
  return status === "done" ? <Badge tone="dim">완료</Badge> : status === "today" ? <Badge tone="gold">오늘</Badge> : <Badge tone="neutral">예정</Badge>;
}

/** 회차별 출석 표 — 회차 · 날짜 · 대상 · 출석 · 지각 · 결석 · 출석률(막대) */
export function AttendanceTable({ rows }: { rows: PartnerAttendanceRow[] }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-line bg-card">
      <table className="w-full min-w-[560px] border-collapse text-left" data-testid="attendance-table">
        <thead>
          <tr className="border-b border-line text-[14px] text-sub">
            <th className="px-4 py-3 font-semibold">회차</th>
            <th className="px-3 py-3 font-semibold">날짜</th>
            <th className="px-3 py-3 text-right font-semibold">대상</th>
            <th className="px-3 py-3 text-right font-semibold">출석</th>
            <th className="px-3 py-3 text-right font-semibold">지각</th>
            <th className="px-3 py-3 text-right font-semibold">결석</th>
            <th className="w-[34%] px-4 py-3 font-semibold">출석률 (출석+지각)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const recorded = r.present + r.late + r.absent;
            return (
              <tr key={r.sessionNumber} className="border-b border-line last:border-b-0 text-[15px]">
                <td className="px-4 py-3 font-bold text-fg">{r.sessionNumber}회차</td>
                <td className="px-3 py-3 text-fg2">{dayLabel(r.date)}</td>
                <td className="px-3 py-3 text-right text-fg2">{r.enrolled}</td>
                <td className="px-3 py-3 text-right text-fg">{recorded ? r.present : "-"}</td>
                <td className="px-3 py-3 text-right text-late">{recorded ? r.late : "-"}</td>
                <td className="px-3 py-3 text-right text-danger">{recorded ? r.absent : "-"}</td>
                <td className="px-4 py-3">
                  {r.rate == null ? (
                    <span className="text-[14px] text-faint">{recorded === 0 ? "수업 전" : "-"}</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-[10px] flex-1 overflow-hidden rounded-full bg-line2" aria-hidden="true">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${r.rate}%` }} />
                      </div>
                      <span className="w-[52px] shrink-0 text-right text-[15px] font-bold text-fg">{rateText(r.rate)}</span>
                    </div>
                  )}
                  {r.unrecorded > 0 && recorded > 0 && <p className="mt-1 text-[14px] text-faint">미입력 {r.unrecorded}명</p>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LessonBody({ l }: { l: PartnerLesson }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        {l.description && <p className="text-[15px] leading-[24px] text-fg2">{l.description}</p>}
        {l.objectives.length > 0 && (
          <>
            <p className="mt-3 text-[14px] font-bold text-sub">학습 목표</p>
            <ul className="mt-1 list-disc pl-5 text-[15px] leading-[23px] text-fg2">
              {l.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div>
        {l.curriculum.length > 0 && (
          <>
            <p className="text-[14px] font-bold text-sub">수업 흐름 ({l.lessonCount}차시)</p>
            <ol className="mt-1 list-decimal pl-5 text-[15px] leading-[23px] text-fg2">
              {l.curriculum.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ol>
          </>
        )}
        {l.materials.length > 0 && <p className="mt-3 text-[15px] text-fg2">준비물 · {l.materials.join(", ")}</p>}
        <p className="mt-3 text-[15px] text-fg2">강사 · {l.instructors.map((i) => `${i.name} (${i.sections.join("·")})`).join(", ")}</p>
      </div>
    </div>
  );
}

/** [수업] 메뉴 안의 두 화면 — 회차별 수업 · 강사진 */
export function LessonsSwitch({ current }: { current: "lessons" | "instructors" }) {
  const items = [
    { id: "lessons", label: "회차별 수업", href: "/partner/lessons" },
    { id: "instructors", label: "강사진", href: "/partner/instructors" },
  ] as const;
  return (
    <div role="tablist" aria-label="수업 보기" className="mb-4 inline-flex rounded-xl border border-line bg-card2 p-1">
      {items.map((it) => {
        const on = it.id === current;
        return (
          <Link
            key={it.id}
            href={it.href}
            role="tab"
            aria-selected={on}
            className={`tap flex h-10 items-center rounded-lg px-4 text-[15px] ${on ? "bg-elev font-bold text-fg" : "font-medium text-sub"}`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
