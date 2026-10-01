"use client";

/**
 * 직원 앱 틀 — 센터 · 회사 · 강사가 같은 틀을 쓴다
 *   컴퓨터: 위 한 줄에 [앱 이름] [메뉴] ……… [운영 건] [내 정보]
 *   휴대폰: 위 한 줄에 [앱 이름] ……… [운영 건] [내 정보], 메뉴는 아래 탭
 * 내용 폭은 컴퓨터에서 가운데 최대 56rem.
 */

import Link from "next/link";
import { StaffNav, StaffTopNav } from "@/components/staff/StaffNav";
import { buildStaffNavItems, STAFF_BASE, STAFF_TITLE, type StaffVariant } from "@/lib/staffAppNav";
import { useAuth } from "@/providers/AuthProvider";
import { useCenterRun } from "@/providers/CenterRunProvider";

function RunPicker() {
  const { runs, selectedRun, selectRun } = useCenterRun();
  if (runs.length <= 1) return null;
  return (
    <label className="flex min-w-0 items-center">
      <span className="sr-only">운영 건 선택</span>
      <select
        aria-label="운영 건 선택"
        className="h-10 w-full min-w-0 max-w-[10rem] truncate rounded-lg border border-line bg-elev px-2 text-[14px] font-semibold text-fg md:max-w-[15rem]"
        value={selectedRun?.id ?? ""}
        onChange={(e) => selectRun(e.target.value)}
      >
        {runs.map((r) => (
          <option key={r.id} value={r.id}>
            {r.title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function StaffShell({ variant, children }: { variant: StaffVariant; children: React.ReactNode }) {
  const { user } = useAuth();
  const { summary } = useCenterRun();
  const badges = variant === "center" ? { chatWaiting: summary?.dashboard.chatWaiting ?? 0 } : undefined;
  const base = STAFF_BASE[variant];
  const profileHref = variant === "company" ? `${base}/settings` : `${base}/profile`;
  const name = user?.displayName ?? user?.email ?? "";
  const items = buildStaffNavItems(variant);

  return (
    // 컴퓨터에서는 아래 탭이 없으니 --tabbar-h 를 0 으로 (채팅 입력줄 · 리포트 제출 버튼이 맨 아래에 붙도록)
    <div className="flex min-h-dvh flex-1 flex-col bg-paper text-fg md:[--tabbar-h:0px]" data-full-width="true">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper" style={{ paddingTop: "var(--sat)" }}>
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 md:gap-6 md:px-6">
          <Link href={base} className="tap flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-[14px] font-extrabold text-ink">TC</span>
            <span className="text-[16px] font-bold text-fg">{STAFF_TITLE[variant]}</span>
          </Link>
          <StaffTopNav items={items} badges={badges} />
          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            {variant === "center" && <RunPicker />}
            <Link href={profileHref} className="tap flex h-10 shrink-0 items-center gap-1 rounded-lg border border-line bg-elev px-[10px] text-[14px] font-semibold text-fg2" aria-label="내 정보">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8.5" r="3.8" />
                <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
              </svg>
              <span className="hidden max-w-[6em] truncate sm:inline">{name || "내 정보"}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-8 pt-5 md:px-6 md:pt-7">{children}</main>

      <StaffNav items={items} badges={badges} />
    </div>
  );
}
