"use client";

/**
 * 프로그램 안내 — 회차별 내용 (시간·기간은 위에 한 번, 회차마다 날짜 · 주제 · 강사)
 * /main/program/[programId]/guide/sessions — 회차를 누르면 회차 화면
 */

import { useRouter } from "next/navigation";
import { GuidePage } from "@/components/program/GuidePage";
import type { Program } from "@/data/dummyProgram";
import { periodLine, scheduleLine } from "@/data/programGuide";
import { buildTimeline } from "@/data/programView";
import { formatKoreanDate } from "@/lib/dates";

export default function GuideSessionsPage() {
  const router = useRouter();
  return (
    <GuidePage section="sessions">
      {({ program, programId, passQs }) => (
        <SessionsSection
          program={program}
          onOpen={(sessionId) =>
            router.push(`/main/program/${programId}/session/${sessionId}${passQs ? `?${passQs}` : ""}`)
          }
        />
      )}
    </GuidePage>
  );
}

function SessionsSection({ program, onOpen }: { program: Program; onOpen: (sessionId: string) => void }) {
  const timeline = buildTimeline(program);
  return (
    <>
      {/* 시간·기간은 위에 한 번만 */}
      <p className="rounded-2xl bg-brand-light px-4 py-3 text-[17px] font-bold leading-[26px] text-brand">
        {scheduleLine(program)}
        <span className="block text-[16px] font-semibold text-gray-700">
          {periodLine(program)} · 총 {program.totalSessions}회
        </span>
      </p>
      <p className="px-1 text-[16px] text-gray-600">회차를 누르면 수업 내용·강사·준비물을 볼 수 있어요.</p>
      <ol className="flex flex-col gap-3">
        {timeline.map((e) =>
          e.kind === "session" ? (
            <li key={e.session.id}>
              <button
                type="button"
                onClick={() => onOpen(e.session.id)}
                aria-label={`${e.session.sessionNumber}회차 ${e.session.topic}`}
                className="tap flex w-full items-center gap-4 rounded-[20px] border border-gray-200 bg-white px-4 py-4 text-left"
              >
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-light leading-none text-brand">
                  <span className="text-[20px] font-extrabold">{e.session.sessionNumber}</span>
                  <span className="mt-[2px] text-[14px] font-semibold">회차</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-bold text-brand">{formatKoreanDate(e.key)}</span>
                  <span className="mt-[2px] block text-[18px] font-bold leading-[26px] text-gray-900">
                    {e.session.topic}
                  </span>
                  <span className="block text-[15px] text-gray-600">{e.session.instructor.name} 강사</span>
                </span>
                <span aria-hidden="true" className="text-[24px] text-gray-400">
                  ›
                </span>
              </button>
            </li>
          ) : (
            <li
              key={`break-${e.key}`}
              className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-5 py-3 text-[16px] font-semibold text-amber-800"
            >
              ⏸ {formatKoreanDate(e.key)} · {e.reason}
            </li>
          ),
        )}
      </ol>
    </>
  );
}
