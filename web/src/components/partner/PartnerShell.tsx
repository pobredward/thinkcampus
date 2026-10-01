"use client";

/**
 * 발주처 포털 틀 — 컴퓨터 화면 우선 (넓게), 폰에서도 볼 수 있게
 *   위: 로고 · 기관 · 담당자 이름 · 운영 건 선택 · 로그아웃
 *   탭: 현황 · 수업(강사진 포함) · 참여 · 민원·문의 · 만족도 · 보고서 (휴대폰은 가로 스크롤)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { PROGRAM_RUN_STATUS_LABEL, useApi, useQuery } from "@/services";

const TABS: Array<{ href: string; label: string; exact?: boolean; also?: string[] }> = [
  { href: "/partner", label: "현황", exact: true },
  { href: "/partner/lessons", label: "수업", also: ["/partner/instructors"] },
  { href: "/partner/participation", label: "참여" },
  { href: "/partner/inquiries", label: "민원·문의" },
  { href: "/partner/survey", label: "만족도" },
  { href: "/partner/reports", label: "보고서" },
];

export function PartnerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const api = useApi();
  const { user, signOut } = useAuth();
  const { data: access } = useQuery(() => (user ? api.partner.getAccess() : null), [api, user?.uid]);
  const { runs, selectedRun, selectRun } = usePartnerRun();

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-paper text-fg" data-full-width="true">
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper" style={{ paddingTop: "var(--sat)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 md:px-6">
          <Link href="/partner" className="tap flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-[14px] font-extrabold text-ink">TC</span>
            <span className="text-[16px] font-bold text-fg">발주처 담당자</span>
          </Link>
          {access?.organization && (
            <span className="hidden text-[15px] text-sub lg:inline">
              {access.organization} · {access.displayName}
              {access.title ? ` ${access.title}` : ""}
            </span>
          )}
          <button type="button" onClick={() => void signOut()} className="tap order-2 ml-auto h-10 shrink-0 rounded-lg border border-line bg-elev px-3 text-[14px] font-semibold text-fg2 md:order-3 md:ml-0">
            로그아웃
          </button>
          <div className="order-3 flex w-full min-w-0 md:order-2 md:ml-auto md:w-auto">
            {runs.length > 1 ? (
              <label className="w-full min-w-0 md:w-auto">
                <span className="sr-only">운영 건 선택</span>
                <select
                  aria-label="운영 건 선택"
                  value={selectedRun?.id ?? ""}
                  onChange={(e) => selectRun(e.target.value)}
                  className="h-10 w-full truncate rounded-lg border border-line bg-elev px-2 text-[15px] font-semibold text-fg md:w-auto md:max-w-[26rem]"
                  data-testid="partner-run-select"
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({PROGRAM_RUN_STATUS_LABEL[r.status]})
                    </option>
                  ))}
                </select>
              </label>
            ) : selectedRun ? (
              <span className="truncate text-[15px] font-semibold text-fg2">{selectedRun.title}</span>
            ) : null}
          </div>
        </div>
        <nav aria-label="발주처 메뉴" className="mx-auto max-w-6xl px-2 md:px-4">
          <ul className="no-scrollbar flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const on = t.exact ? pathname === t.href : [t.href, ...(t.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
              return (
                <li key={t.href} className="shrink-0">
                  <Link
                    href={t.href}
                    aria-current={on ? "page" : undefined}
                    className={`tap relative flex h-12 items-center px-4 text-[16px] ${on ? "font-bold text-gold" : "font-medium text-sub hover:text-fg2"}`}
                  >
                    {t.label}
                    {on && <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-gold" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-12 pt-6 md:px-6">{children}</main>
    </div>
  );
}
