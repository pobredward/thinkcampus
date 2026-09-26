"use client";

/**
 * 상단 경로 — "지금 어디에 있는지" 한 줄로 보여 주고, 앞 단계를 누르면 그 화면으로 돌아간다.
 *   홈 › 토요 창의융합 › 3회차
 *
 * - 앞 단계(링크): 보조 글자색, 누르면 방문 기록에 있으면 그만큼 뒤로(기록이 쌓이지 않음), 없으면 이동
 * - 지금 화면: 골드 · 굵게 · 누를 수 없음 (aria-current="page")
 * - 한 줄에 다 안 들어가면 옆으로 밀 수 있고, 처음엔 끝(지금 화면)이 보이도록 맞춘다
 * - 누르는 영역은 높이 44px (학부모용 최소 터치 크기)
 * - trailing: 같은 줄 오른쪽 끝에 둘 것 (예: 홈의 자녀 전환 버튼) — 경로(nav) 바깥에 둔다
 * (모바일 components/ui/Breadcrumbs.tsx 와 같은 모양)
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMapMainPath } from "@/hooks/useMainBase";
import { goUpTo } from "@/lib/navHistory";

export interface Crumb {
  label: string;
  /** 누르면 갈 곳 — 마지막(지금 화면)은 비워 둔다 */
  href?: string;
}

function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-[3px] shrink-0 text-faint">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}

export function Breadcrumbs({
  items,
  className = "",
  trailing,
}: {
  items: Crumb[];
  className?: string;
  trailing?: ReactNode;
}) {
  const router = useRouter();
  const mapMain = useMapMainPath();
  const scroller = useRef<HTMLDivElement>(null);

  // 길면 끝(지금 화면)이 보이도록
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [items]);

  return (
    <div className={`no-print -mx-5 flex items-center ${className}`}>
      <nav aria-label="현재 위치" className="min-w-0 flex-1">
        <div ref={scroller} className="no-scrollbar overflow-x-auto">
          <ol className="flex h-11 w-max min-w-full items-center px-4">
            {items.map((c, i) => {
              const last = i === items.length - 1;
              const isHome = i === 0 && c.label === "홈";
              const href = c.href ? mapMain(c.href) : undefined;
              return (
                <li key={`${i}-${c.label}`} className="flex shrink-0 items-center">
                  {last || !href ? (
                    <span
                      aria-current={last ? "page" : undefined}
                      className={`flex h-11 max-w-[13em] items-center gap-1 truncate px-1 text-[15px] ${
                        last ? "font-bold text-gold" : "font-medium text-sub"
                      }`}
                    >
                      {isHome && <HomeIcon />}
                      <span className="truncate">{c.label}</span>
                    </span>
                  ) : (
                    <a
                      href={href}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // 새 탭 열기는 그대로
                        e.preventDefault();
                        goUpTo(href!, { back: () => router.back(), push: (h) => router.push(h) });
                      }}
                      className="tap flex h-11 max-w-[10em] items-center gap-1 rounded-lg px-1 text-[15px] font-medium text-sub hover:text-fg"
                    >
                      {isHome && <HomeIcon />}
                      <span className="truncate">{c.label}</span>
                    </a>
                  )}
                  {!last && <Chevron />}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>
      {trailing && <div className="shrink-0 pl-2 pr-5">{trailing}</div>}
    </div>
  );
}
