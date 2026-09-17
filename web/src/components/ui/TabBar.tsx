"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 하단 메인 탭바 — 홈 / 알림 / 내 정보 (모바일 main/_layout.tsx 와 동일)
 * 프로그램·출결·리포트·FAQ 등 하위 화면에서는 어떤 탭도 활성화되지 않는다.
 */
const TABS = [
  { href: "/main", symbol: "🏠", label: "홈", match: (p: string) => p === "/main" },
  {
    href: "/main/notification",
    symbol: "🔔",
    label: "알림",
    match: (p: string) => p.startsWith("/main/notification"),
  },
  {
    href: "/main/profile",
    symbol: "👤",
    label: "내 정보",
    match: (p: string) => p.startsWith("/main/profile"),
  },
] as const;

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="메인 탭"
      className="no-print sticky bottom-0 z-40 border-t border-gray-100 bg-white"
      style={{ paddingBottom: "var(--sab)" }}
    >
      <ul className="flex" style={{ height: "var(--tabbar-h)" }}>
        {TABS.map((t) => {
          const focused = t.match(pathname);
          return (
            <li key={t.href} className="flex flex-1 items-center justify-center pt-[6px]">
              <Link
                href={t.href}
                aria-current={focused ? "page" : undefined}
                className={`tap flex min-w-[44px] flex-col items-center justify-center gap-[1px] rounded-[10px] px-1 py-[2px] ${
                  focused ? "bg-brand-light" : ""
                }`}
              >
                <span className="text-[22px] leading-none">{t.symbol}</span>
                <span
                  className={`text-[14px] ${
                    focused ? "font-bold text-brand" : "font-medium text-gray-500"
                  }`}
                >
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
