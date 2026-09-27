"use client";

/**
 * 체험판 배너 — 화면 맨 위 한 줄. 체험 중일 때만 보인다.
 *   [학부모 체험] 예시 데이터 · 저장은 이 탭에서만   초기화 · 역할 바꾸기 · 체험 종료
 */

import Link from "next/link";
import { DEMO_HUB_PATH, DEMO_ROLE_LABEL } from "@/lib/demoMode";
import { useDemo } from "@/providers/DemoProvider";
import { useDialog } from "@/providers/DialogProvider";

export function DemoBanner() {
  const { role, reset } = useDemo();
  const dialog = useDialog();
  if (!role) return null;

  async function confirmReset() {
    const ok = await dialog.confirm("체험 데이터 초기화", "지금까지 체험하며 저장한 출결·리포트·공지를 지우고 처음 상태로 돌립니다.", {
      confirmText: "초기화",
    });
    if (ok) reset();
  }

  return (
    <div
      className="no-print flex h-11 items-center gap-2 border-b border-gold-border bg-gold-light px-4 text-[14px]"
      data-testid="demo-banner"
      role="status"
    >
      <span className="shrink-0 rounded-md border border-gold-border px-2 py-[2px] font-bold text-gold">{DEMO_ROLE_LABEL[role]} 체험</span>
      <span className="hidden min-w-0 flex-1 truncate text-sub sm:inline">예시 데이터 · 저장한 내용은 이 탭에서만 유지돼요</span>
      <span className="min-w-0 flex-1 sm:hidden" />
      <button type="button" onClick={() => void confirmReset()} className="tap shrink-0 px-1 font-semibold text-fg2 underline underline-offset-2">
        초기화
      </button>
      <Link href={DEMO_HUB_PATH} className="tap shrink-0 px-1 font-semibold text-fg2 underline underline-offset-2">
        역할 바꾸기
      </Link>
      {/* /demo/exit 는 쿠키를 지우는 route handler — Link 로 미리 불러오면(prefetch) 안 되므로 일반 링크 */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/demo/exit" className="tap shrink-0 px-1 font-semibold text-gold underline underline-offset-2">
        체험 종료
      </a>
    </div>
  );
}
