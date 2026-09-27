"use client";

/**
 * 직원 앱 틀 — 위 한 줄 헤더(앱 이름 · 운영 건 선택 · 내 정보) + 내용 + 아래 탭
 * 센터·회사·강사가 같은 틀을 쓴다. 데스크톱에서는 가운데 최대 42rem, 폰에서는 꽉 채움.
 */

import Link from "next/link";
import { StaffNav } from "@/components/staff/StaffNav";
import { buildStaffNavItems, STAFF_BASE, STAFF_TITLE, type StaffVariant } from "@/lib/staffAppNav";
import { useAuth } from "@/providers/AuthProvider";
import { useCenterRun } from "@/providers/CenterRunProvider";

function RunPicker() {
  const { runs, selectedRun, selectRun } = useCenterRun();
  if (runs.length <= 1) {
    return selectedRun ? <span className="truncate text-[14px] font-semibold text-fg2">{selectedRun.contractCode}</span> : null;
  }
  return (
    <label className="flex min-w-0 items-center gap-1">
      <span className="sr-only">운영 건 선택</span>
      <select
        aria-label="운영 건 선택"
        className="h-9 max-w-[11rem] truncate rounded-lg border border-line bg-elev px-2 text-[14px] font-semibold text-fg"
        value={selectedRun?.id ?? ""}
        onChange={(e) => selectRun(e.target.value)}
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.contractCode} · {r.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StaffShell({ variant, subtitle, children }: { variant: StaffVariant; subtitle?: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const base = STAFF_BASE[variant];
  const profileHref = variant === "company" ? `${base}/settings` : `${base}/profile`;
  const name = user?.displayName ?? user?.email ?? "";

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper text-fg" data-full-width="true">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper" style={{ paddingTop: "var(--sat)" }}>
        <div className="mx-auto flex h-12 max-w-2xl items-center gap-3 px-4">
          <Link href={base} className="tap flex min-w-0 shrink-0 items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-[14px] font-extrabold text-ink">TC</span>
            <span className="text-[15px] font-bold text-fg">{STAFF_TITLE[variant]}</span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {variant === "center" ? <RunPicker /> : subtitle ? <span className="truncate text-[14px] text-sub">{subtitle}</span> : null}
            <Link href={profileHref} className="tap flex h-9 shrink-0 items-center gap-1 rounded-lg border border-line bg-elev px-2 text-[14px] font-semibold text-fg2" aria-label="내 정보">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8.5" r="3.8" />
                <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
              </svg>
              <span className="max-w-[6em] truncate">{name || "내 정보"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-8 pt-5">{children}</main>

      <StaffNav items={buildStaffNavItems(variant)} />
    </div>
  );
}
