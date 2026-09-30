"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApi, useQuery } from "@/services";

/**
 * 하단 메인 탭바 — 홈 / 채팅 / 알림 / 내 정보 (모바일 main/(tabs)/_layout.tsx 와 동일)
 * 선 아이콘(잉크) + 선택된 탭 위에 짧은 골드 선. 이모지는 쓰지 않는다.
 * 채팅 탭에는 안 읽은 메시지 수 (실서비스: 방 문서 unreadBy 합 · 실시간)
 * 프로그램·출결·리포트·FAQ 등 하위 화면에서는 어떤 탭도 활성화되지 않는다.
 * 채팅방 화면(/main/chat/[roomId])에서는 탭바를 숨긴다 — main/layout.tsx
 */
type IconName = "home" | "chat" | "bell" | "user";

const MAIN_BASE = "/main";

function buildTabs(base: string) {
  return [
    { href: base, icon: "home" as IconName, label: "홈", match: (p: string) => p === base },
    {
      href: `${base}/chat`,
      icon: "chat" as IconName,
      label: "채팅",
      match: (p: string) => p.startsWith(`${base}/chat`),
    },
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
  if (name === "chat")
    return (
      <svg {...common}>
        <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.2 3.2a.5.5 0 0 1-.8-.4v-2.8h-.5a2 2 0 0 1-2-2z" />
        <path d="M8.5 9.5h7M8.5 12.5h4.5" />
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

function useUnreadChats(): number {
  const api = useApi();
  const { data, refetch } = useQuery(() => api.guardian.countUnreadChats(), [api]);
  useEffect(() => api.guardian.watchChat({}, () => void refetch()), [api, refetch]);
  return data ?? 0;
}

export function TabBar() {
  const pathname = usePathname();
  const tabs = buildTabs(MAIN_BASE);
  const unread = useUnreadChats();
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
                aria-label={t.icon === "chat" && unread > 0 ? `${t.label} (안 읽은 메시지 ${unread}개)` : undefined}
                className={`tap flex min-w-[56px] flex-col items-center justify-center gap-[3px] px-2 py-1 ${
                  focused ? "text-gold" : "text-faint"
                }`}
              >
                <span className="relative">
                  <TabIcon name={t.icon} />
                  {t.icon === "chat" && unread > 0 && (
                    <span
                      className="absolute -right-[11px] -top-[6px] flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-gold px-[5px] text-[14px] font-bold leading-none text-ink"
                      data-testid="tab-chat-badge"
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
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
