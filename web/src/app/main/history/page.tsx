"use client";

/**
 * 이전 수강 이력 — 홈 맨 아래 "이전 수강 이력 보기" 버튼에서 들어온다 (모바일 app/main/history.tsx)
 * 끝난 프로그램 목록. 누르면 그 프로그램 화면(더미 단계: 수강 중 프로그램 화면으로 대체)
 */

import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { DUMMY_PAST_PROGRAMS, type PastProgram } from "@/data/dummyHistory";
import { useUpTo } from "@/hooks/useBack";
import { useChildren } from "@/hooks/useChildren";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useSelectedChild } from "@/hooks/useSelectedChild";
import { useAuth } from "@/providers/AuthProvider";

export default function HistoryPage() {
  usePageTitle("이전 수강 이력");
  const router = useRouter();
  const goHome = useUpTo("/main");
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
    });
    router.push(`/main/program/${p.programId}?${qs.toString()}`);
  };

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-10">
      <header className="bg-brand px-5 pb-5" style={{ paddingTop: "calc(var(--sat) + 10px)" }}>
        <button type="button" onClick={goHome} className="tap -ml-1 py-1 pr-2 text-[16px] font-medium text-blue-100">
          ← 홈
        </button>
        {selected && <p className="mt-2 text-[15px] text-blue-100">{selected.studentName} 학생</p>}
        <h1 className="mt-1 text-[24px] font-extrabold leading-[32px] text-white">📂 이전 수강 이력</h1>
      </header>

      {loading && (
        <div className="flex justify-center p-12">
          <Spinner color="#1d4ed8" size="large" />
        </div>
      )}

      {!loading && items.length === 0 && (
        <p className="m-5 rounded-[20px] border border-dashed border-gray-200 bg-white p-8 text-center text-[17px] text-gray-600">
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
                className="tap flex w-full items-center gap-4 rounded-[20px] border border-gray-200 bg-white px-4 py-4 text-left"
              >
                <span
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-[24px]"
                >
                  ✅
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[18px] font-bold leading-[26px] text-gray-900">{p.title}</span>
                  <span className="block text-[15px] text-gray-600">
                    {p.startDate} ~ {p.endDate}
                  </span>
                  <span className="block text-[15px] text-gray-600">총 {p.totalSessions}회 · 수료 완료</span>
                </span>
                <span aria-hidden="true" className="text-[24px] text-gray-400">
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
