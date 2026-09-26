"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMainBase } from "@/hooks/useMainBase";

/**
 * 하단 메인 탭바 — 홈 / 알림 / 내 정보 (모바일 main/(tabs)/_layout.tsx 와 동일)
 * 선 아이콘(잉크) + 선택된 탭 위에 짧은 골드 선. 이모지는 쓰지 않는다.
 * 프로그램·출결·리포트·FAQ 등 하위 화면에서는 어떤 탭도 활성화되지 않는다.
 */
type IconName = "home" | "bell" | "user";

function buildTabs(base: string) {
  return [
    { href: base, icon: "home" as IconName, label: "홈", match: (p: string) => p === base },
    {
      href: `${base}/notification`,
      icon: "bell" as IconName,
      label: "알림",
      match: (p: string) => p.startsWith(`${base}/notification`),
    },
    {
      href: `${base}/profile`,
      icon: "user" as IconName,
      label: "내 정보",
      match: (p: string) => p.startsWith(`${base}/profile`),
    },
  ];
}

function TabIcon({ name }: { name: IconName }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "home")
    return (
      <svg {...common}>
        <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  if (name === "bell")
    return (
      <svg {...common}>
        <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" />
        <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
      </svg>
    );
  return (
    <svg {...common}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
    </svg>
  );
}

export function TabBar() {
  const pathname = usePathname();
  const mainBase = useMainBase();
  const tabs = buildTabs(mainBase);
  return (
    <nav
      aria-label="메인 탭"
      className="no-print sticky bottom-0 z-40 border-t border-line bg-paper"
      style={{ paddingBottom: "var(--sab)" }}
    >
      <ul className="flex" style={{ height: "var(--tabbar-h)" }}>
        {tabs.map((t) => {
          const focused = t.match(pathname);
          return (
            <li key={t.href} className="relative flex flex-1 items-center justify-center">
              {focused && (
                <span aria-hidden="true" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-gold" />
              )}
              <Link
                href={t.href}
                aria-current={focused ? "page" : undefined}
                className={`tap flex min-w-[56px] flex-col items-center justify-center gap-[3px] px-2 py-1 ${
                  focused ? "text-gold" : "text-faint"
                }`}
              >
                <TabIcon name={t.icon} />
                <span className={`text-[14px] ${focused ? "font-bold text-gold" : "font-medium text-sub"}`}>
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
