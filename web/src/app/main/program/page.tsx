"use client";

/**
 * 프로그램 탭 — 회차 목록 (모바일 app/main/program/index.tsx)
 * 회차를 누르면 회차 화면(/main/program/[programId]/session/[sessionId])의 "내용" 탭으로 간다.
 */

import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";

export default function ProgramListPage() {
  usePageTitle("프로그램");
  const router = useRouter();
  const program = DUMMY_PROGRAM;

  return (
    <div className="flex flex-1 flex-col bg-paper pb-8">
      {/* 헤더 */}
      <div
        className="border-b border-line bg-card px-5 pb-4"
        style={{ paddingTop: "calc(var(--sat) + 20px)" }}
      >
        <h1 className="text-[24px] font-bold text-fg">프로그램</h1>
      </div>

      {/* 캠프 정보 배너 */}
      <div className="mx-5 mt-4 mb-1 overflow-hidden rounded-2xl border border-line bg-card">
        <div className="p-5">
          <p className="mb-[6px] text-[14px] font-semibold uppercase tracking-[1px] text-sub">
            {program.category}
          </p>
          <p className="mb-1 text-[20px] font-bold text-fg">{program.title}</p>
          <p className="mb-[14px] text-[15px] text-sub">{program.subtitle}</p>

          {/* 핵심 정보 칩 행 */}
          <div className="mb-3 flex flex-wrap gap-[6px]">
            <div className="rounded-[20px] bg-elev px-[10px] py-1">
              <span className="text-[14px] font-semibold text-fg">
                📅 {program.fixedDay}요일 격주
              </span>
            </div>
            <div className="rounded-[20px] bg-elev px-[10px] py-1">
              <span className="text-[14px] font-semibold text-fg">
                🕙 {program.startTime}~{program.endTime}
              </span>
            </div>
            <div className="rounded-[20px] bg-elev px-[10px] py-1">
              <span className="text-[14px] font-semibold text-fg">
                총 {program.totalSessions}회 · {program.totalHours}차시
              </span>
            </div>
          </div>

          {/* 기간 + 장소 */}
          <p className="mb-1 text-[14px] text-sub">
            {program.startDate} – {program.endDate}
          </p>
          <p className="text-[14px] text-sub">📍 {program.location}</p>
        </div>
      </div>

      {/* 회차 목록 */}
      <h2 className="px-5 pt-5 pb-[10px] text-[15px] font-semibold uppercase tracking-[0.5px] text-sub">
        회차별 일정
      </h2>

      {program.sessions.map((session) => (
        <button
          key={session.id}
          type="button"
          onClick={() => router.push(`/main/program/${program.id}/session/${session.id}?tab=content`)}
          className="tap mx-5 mb-2 flex items-center rounded-[14px] border border-line bg-card p-[14px] text-left"
        >
          {/* 회차 번호 */}
          <span className="mr-[14px] shrink-0">
            <span className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-elev">
              <span className="text-[17px] font-extrabold leading-[21px] text-gold">
                {session.sessionNumber}
              </span>
              <span className="text-[14px] font-semibold text-gold">회차</span>
            </span>
          </span>

          {/* 내용 */}
          <span className="block min-w-0 flex-1">
            <span className="mb-[3px] block text-[14px] text-sub">
              {session.date}　{session.startTime}~{session.endTime}
            </span>
            <span className="mb-[3px] block truncate text-[16px] font-bold text-fg">
              {session.topic}
            </span>
            <span className="block text-[14px] text-sub">
              강사: {session.instructor.name} · {session.sessionHours}차시(
              {session.durationMinutes}분)
            </span>
          </span>

          {/* 화살표 */}
          <span className="ml-2 text-[22px] text-faint">›</span>
        </button>
      ))}

      <div className="h-6" />
    </div>
  );
}
