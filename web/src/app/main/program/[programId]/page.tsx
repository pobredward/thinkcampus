"use client";

/**
 * 프로그램 화면 (수강 중) — 스크롤 없이 한눈에
 *
 *   [파란 헤더]   학생 · 프로그램명 · 요일/시간 · 기간 · 장소 (날짜는 여기 한 번만)
 *   [수업 안내]   수업 규정·지침 · 공지사항 · 자주 묻는 질문 · 프로그램 목적 (각각 독립 페이지)
 *   [회차별 수업] 1회차 ~ 6회차 버튼 (한 줄에 3개) — 끝난 회차는 회색, 다음 수업은 파란색. 출결은 눌러서 회차 화면에서
 *   [종합 리포트] 모든 회차가 끝나면 열림
 *
 * 회차 버튼을 누르면 → /main/program/[programId]/session/[sessionId]
 *   (출결 · 일정 · 내용 · Q&A · 끝난 회차는 리포트)
 *
 * 수강 예정 프로그램(status: upcoming)은 요약 + 안내 버튼 화면(UpcomingProgram)을 보여 준다.
 *
 * 쿼리스트링: studentName · programTitle · sid(학생 id)
 */

import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GuideMenu } from "@/components/program/GuideMenu";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import { UpcomingProgram } from "@/components/program/UpcomingProgram";
import { periodLine, scheduleLine, type GuideSection } from "@/data/programGuide";
import {
  buildDayItems,
  getDummyProgram,
  isDone,
  isProgramFinished,
  isUpcomingProgram,
  nextUpcoming,
  pickDummyAttendance,
  summarize,
  type DayItem,
} from "@/data/programView";
import { useUpTo } from "@/hooks/useBack";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatShortDate } from "@/lib/dates";

export default function ProgramSessionsPage() {
  const { programId } = useParams<{ programId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const goHome = useUpTo("/main");

  const studentName = sp.get("studentName") ?? "";
  const sid = sp.get("sid");

  // TODO: Firestore 에서 programId / studentId 기준 조회
  const program = getDummyProgram(programId);
  const programTitle = sp.get("programTitle") ?? program.title;
  usePageTitle(programTitle);

  const attendance = useMemo(() => pickDummyAttendance(sid), [sid]);
  const items = useMemo(() => buildDayItems(program, attendance), [program, attendance]);
  const qs = sp.toString();

  // 수강 예정 — 요약 + 안내 버튼
  if (isUpcomingProgram(program)) {
    return (
      <UpcomingProgram
        program={program}
        studentName={studentName}
        programTitle={programTitle}
        qs={qs}
        onBack={goHome}
      />
    );
  }

  const summary = summarize(items, program.totalSessions);
  const next = nextUpcoming(items);
  const finished = isProgramFinished(items);

  const openSession = (d: DayItem) =>
    router.push(`/main/program/${programId}/session/${d.session.id}${qs ? `?${qs}` : ""}`);
  const openReport = () => router.push(`/main/program/${programId}/report${qs ? `?${qs}` : ""}`);
  const openGuide = (section: GuideSection) =>
    router.push(`/main/program/${programId}/guide/${section}${qs ? `?${qs}` : ""}`);

  // 운영 요일·시간 / 기간 / 장소 — 날짜는 여기서 한 번만
  const meta = [
    scheduleLine(program),
    `${periodLine(program)} · 총 ${program.totalSessions}회`,
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

      {/* ── 수업 안내 ─────────────────────────── */}
      <section aria-labelledby="guide-title" className="px-4 pt-5">
        <h2 id="guide-title" className="px-1 pb-3 text-[20px] font-extrabold text-gray-900">
          수업 안내
        </h2>
        <GuideMenu
          sections={["rules", "notices", "qna", "purpose"]}
          noticeCount={program.notices?.length}
          onOpen={openGuide}
        />
      </section>

      {/* ── 회차별 수업 ───────────────────────── */}
      <section aria-labelledby="sessions-title" className="px-4 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-1">
          <h2 id="sessions-title" className="text-[20px] font-extrabold text-gray-900">
            회차별 수업
          </h2>
          <p className="text-[16px] font-bold text-gray-700">
            진행 {summary.done}
            <span className="font-medium text-gray-500"> / {summary.total}회</span>
          </p>
        </div>
        <p className="px-1 pt-1 pb-3 text-[16px] text-gray-600">회차를 누르면 출결·내용·Q&amp;A를 볼 수 있어요.</p>
        <ol className="grid grid-cols-3 gap-3">
          {items.map((d) => (
            <li key={d.key}>
              <SessionButton item={d} isNext={d === next} onOpen={() => openSession(d)} />
            </li>
          ))}
        </ol>
      </section>

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

// ── 회차 버튼 하나 ─────────────────────────────────────────
// 출결(출석·지각·결석)은 여기서 보이지 않는다 — 눌러서 회차 화면에서 확인
// 상태는 색으로만 구분: 끝난 회차 = 회색(차분하게) · 다음 수업 = 파란색 채움 · 남은 회차 = 흰 바탕 파란 테두리

const BUTTON_STYLE = {
  done: {
    box: "border-gray-200 bg-gray-100 text-gray-500 shadow-[0_2px_0_rgba(17,24,39,0.06)]",
    date: "text-gray-500",
  },
  next: {
    box: "border-brand bg-brand text-white shadow-[0_3px_0_rgba(29,78,216,0.35)]",
    date: "text-blue-100",
  },
  later: {
    box: "border-blue-200 bg-white text-brand shadow-[0_3px_0_rgba(29,78,216,0.18)]",
    date: "text-gray-700",
  },
} as const;

function SessionButton({ item, isNext, onOpen }: { item: DayItem; isNext: boolean; onOpen: () => void }) {
  const { session, status } = item;
  const cancelled = status === "cancelled";
  const done = isDone(status);
  const look = BUTTON_STYLE[isNext ? "next" : done ? "done" : "later"];
  const stateLabel = isNext ? " · 다음 수업" : done ? " · 완료" : "";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${session.sessionNumber}회차 ${session.topic}${stateLabel}`}
      data-state={isNext ? "next" : done ? "done" : "later"}
      className={`tap flex min-h-[92px] w-full flex-col items-center justify-center rounded-2xl border-2 px-1 py-3 text-center active:translate-y-[2px] active:shadow-none ${look.box}`}
    >
      <span className="text-[20px] font-extrabold leading-[26px]">{session.sessionNumber}회차</span>
      <span className={`mt-1 text-[15px] font-semibold leading-[20px] ${look.date}`}>{formatShortDate(item.key)}</span>
      {isNext && <span className="mt-1 text-[14px] font-bold leading-[18px] text-white">다음 수업</span>}
      {done && <span className="mt-1 text-[14px] font-bold leading-[18px] text-gray-500">✓ 완료</span>}
      {cancelled && <span className="mt-1 text-[14px] font-semibold leading-[18px] text-gray-500">휴강</span>}
    </button>
  );
}
