"use client";

/**
 * 이전 수강 이력 — 홈 맨 아래 "이전 수강 이력 보기" 버튼에서 들어온다 (모바일 app/main/history.tsx)
 * 끝난 프로그램 목록. 누르면 그 프로그램 화면(더미 단계: 수강 중 프로그램 화면으로 대체)
 */

import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { DUMMY_PAST_PROGRAMS, type PastProgram } from "@/data/dummyHistory";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { HOME_CRUMB } from "@/lib/crumbs";
import { useChildren } from "@/hooks/useChildren";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSelectedChild } from "@/hooks/useSelectedChild";
import { useAuth } from "@/providers/AuthProvider";

export default function HistoryPage() {
  usePageTitle("이전 수강 이력");
  const router = useRouter();
  const { user } = useAuth();
  const { children, loading } = useChildren({ activeOnly: true });
  const { selected } = useSelectedChild(children, user?.uid);

  // TODO: Firestore enrollments(status: completed) 조회
  const items = selected ? DUMMY_PAST_PROGRAMS : [];

  const open = (p: PastProgram) => {
    if (!selected) return;
    const qs = new URLSearchParams({
      studentName: selected.studentName,
      programTitle: p.title,
      sid: selected.studentId,
      via: "history", // 상단 경로: 홈 › 이전 수강 이력 › 프로그램
    });
    router.push(`/main/program/${p.programId}?${qs.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10">
      <header className="px-5 pb-5" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs items={[HOME_CRUMB, { label: "이전 수강 이력" }]} />
        {selected && <p className="mt-1 text-[15px] text-sub">{selected.studentName} 학생</p>}
        <h1 className="mt-1 text-[24px] font-extrabold leading-[33px] tracking-[-0.01em] text-fg">이전 수강 이력</h1>
      </header>

      {loading && (
        <div className="flex justify-center p-12">
          <Spinner size="large" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="m-5 rounded-[20px] border border-dashed border-line bg-card p-8 text-center text-[17px] text-sub">
          끝난 프로그램이 아직 없어요.
        </p>
      )}

      {!loading && items.length > 0 && (
        <ul className="flex flex-col gap-3 px-4 pt-5">
          {items.map((p) => (
            <li key={p.programId}>
              <button
                type="button"
                onClick={() => open(p)}
                aria-label={`${p.title} 수강 이력 보기`}
                className="tap flex w-full items-center gap-4 rounded-[18px] border border-line bg-card px-5 py-[18px] text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-bold leading-[26px] text-fg">{p.title}</span>
                  <span className="block text-[15px] text-sub">
                    {p.startDate} ~ {p.endDate}
                  </span>
                  <span className="block text-[15px] text-sub">총 {p.totalSessions}회 · 수료 완료</span>
                </span>
                <span aria-hidden="true" className="text-[24px] text-faint">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
