"use client";

/**
 * 프로그램 상세 — 회차 목록만 보여 주는 단순한 화면
 *
 *   [파란 헤더]  학생 · 프로그램명 · 요일/시간 · 장소
 *   [진행]       진행 3 / 6회 · 출석/지각/결석
 *   [회차 목록]  1회차 … 6회차 (날짜 · 주제 · 출결 상태, 다음 수업 강조)
 *   [종합 리포트] 모든 회차가 끝나면 열림
 *
 * 회차를 누르면 → /main/program/[programId]/session/[sessionId]
 *   (출결 · 프로그램 일정 · 프로그램 내용 · 프로그램 Q&A · 끝난 회차는 리포트)
 *
 * 쿼리스트링: studentName · programTitle · sid(학생 id)
 */

import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";
import {
  buildDayItems,
  isDone,
  isProgramFinished,
  nextUpcoming,
  pickDummyAttendance,
  STATUS_BADGE,
  STATUS_LABEL,
  summarize,
  type DayItem,
} from "@/data/programView";
import { useUpTo } from "@/hooks/useBack";
import { usePageTitle } from "@/hooks/usePageTitle";
import { daysBetween, dDayLabel, formatKoreanDate, todayKey } from "@/lib/dates";

export default function ProgramSessionsPage() {
  const { programId } = useParams<{ programId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const goHome = useUpTo("/main");

  const studentName = sp.get("studentName") ?? "";
  const sid = sp.get("sid");

  // TODO: Firestore 에서 programId / studentId 기준 조회
  const program = DUMMY_PROGRAM;
  const programTitle = sp.get("programTitle") ?? program.title;
  usePageTitle(programTitle);

  const attendance = useMemo(() => pickDummyAttendance(sid), [sid]);
  const items = useMemo(() => buildDayItems(program, attendance), [program, attendance]);
  const summary = summarize(items, program.totalSessions);
  const next = nextUpcoming(items);
  const finished = isProgramFinished(items);
  const today = todayKey();

  const qs = sp.toString();
  const openSession = (d: DayItem) =>
    router.push(`/main/program/${programId}/session/${d.session.id}${qs ? `?${qs}` : ""}`);
  const openReport = () => router.push(`/main/program/${programId}/report${qs ? `?${qs}` : ""}`);

  // 두 줄: 운영 요일·시간 / 장소 (장소가 길어도 중간에서 끊기지 않게)
  const meta = [
    `${program.frequency === "biweekly" ? "격주" : "매주"} ${program.fixedDay}요일 ${program.startTime}–${program.endTime}`,
    `📍 ${program.location}`,
  ].join("\n");

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-10">
      <ProgramHeader
        mode="overview"
        studentName={studentName}
        programTitle={programTitle}
        meta={meta}
        onBack={goHome}
      />

      {/* ── 진행 ─────────────────────────────── */}
      <div className="relative z-10 mx-4 -mt-3 rounded-[20px] border border-gray-200 bg-white px-5 py-4 shadow-[0_2px_10px_rgba(17,24,39,0.06)]">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-[18px] font-bold text-gray-900">
            진행 {summary.done}
            <span className="font-medium text-gray-500"> / {summary.total}회</span>
          </p>
          <p className="text-[16px] text-gray-600">
            출석 <b className="text-green-700">{summary.present}</b> · 지각{" "}
            <b className="text-amber-700">{summary.late}</b> · 결석{" "}
            <b className="text-red-600">{summary.absent}</b>
          </p>
        </div>
        <ProgressBar value={summary.total ? summary.done / summary.total : 0} height={10} />
      </div>

      {/* ── 회차 목록 ─────────────────────────── */}
      <h2 className="px-5 pt-7 text-[20px] font-extrabold text-gray-900">회차별 수업</h2>
      <p className="px-5 pt-1 pb-3 text-[16px] text-gray-600">회차를 누르면 출결·일정·내용·Q&amp;A를 볼 수 있어요.</p>
      <ol className="flex flex-col gap-3 px-4">
        {items.map((d) => (
          <li key={d.key}>
            <SessionRow item={d} isNext={d === next} today={today} onOpen={() => openSession(d)} />
          </li>
        ))}
      </ol>

      {/* ── 종합 리포트 ───────────────────────── */}
      <div className="mx-4 mt-6">
        {finished ? (
          <button
            type="button"
            onClick={openReport}
            className="tap w-full rounded-2xl bg-brand py-4 text-center text-[17px] font-bold text-white"
          >
            📊 종합 리포트 보기
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 px-5 py-4">
            <p className="text-[17px] font-bold text-gray-700">📊 종합 리포트</p>
            <p className="mt-1 text-[16px] leading-[24px] text-gray-600">
              {summary.total}회 수업이 모두 끝나면 발급돼요. 회차별 리포트는 각 회차에서 볼 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 회차 한 줄 ─────────────────────────────────────────────

function SessionRow({
  item,
  isNext,
  today,
  onOpen,
}: {
  item: DayItem;
  isNext: boolean;
  today: string;
  onOpen: () => void;
}) {
  const { session, status } = item;
  const done = isDone(status);
  const dDay = isNext ? dDayLabel(daysBetween(today, item.key)) : "";

  const numberCls = isNext
    ? "bg-brand text-white"
    : done
      ? "bg-gray-100 text-gray-700"
      : "border border-gray-200 bg-white text-gray-500";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${session.sessionNumber}회차 ${session.topic} · ${isNext ? "다음 수업" : STATUS_LABEL[status]}`}
      className={`tap flex w-full items-center gap-4 rounded-[20px] border bg-white px-4 py-4 text-left ${
        isNext ? "border-brand shadow-[0_2px_10px_rgba(29,78,216,0.12)]" : "border-gray-200"
      }`}
    >
      <span
        className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl leading-none ${numberCls}`}
      >
        <span className="text-[20px] font-extrabold">{session.sessionNumber}</span>
        <span className="mt-[2px] text-[14px] font-semibold">회차</span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2">
          <span className={`text-[16px] ${isNext ? "font-bold text-brand" : "text-gray-600"}`}>
            {formatKoreanDate(item.key)}
          </span>
          {isNext && <span className="text-[15px] font-bold text-brand">{dDay ? `다음 수업 · ${dDay}` : "다음 수업"}</span>}
        </span>
        <span className="mt-[2px] block text-[18px] font-bold leading-[26px] text-gray-900">{session.topic}</span>
      </span>

      <span className="flex shrink-0 items-center gap-1">
        {!isNext && (
          <span className={`rounded-lg px-[10px] py-[3px] text-[15px] font-bold ${STATUS_BADGE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        )}
        <span aria-hidden="true" className="text-[24px] text-gray-400">
          ›
        </span>
      </span>
    </button>
  );
}
