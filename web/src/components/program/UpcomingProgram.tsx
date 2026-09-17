"use client";

/**
 * 수강 예정 프로그램 — 첫 화면은 아주 단순하게 (스크롤 없이 한눈에)
 *
 *   [파란 헤더]   학생 · 프로그램명
 *   [수업 요약]   수강 예정 · 첫 수업 D-day / 기간(첫 수업 ~ 마지막 수업) / 일시(휴강) / 장소
 *   [안내 버튼]   프로그램 목적 · 회차별 내용 · 공지사항 · 수업 규정·지침 · 자주 묻는 질문 · 문의하기
 *
 * 자세한 내용은 버튼을 눌러 안내 페이지(/main/program/[id]/guide/<항목>)에서 본다.
 * 회차별 내용 → 회차를 누르면 회차 화면(일정 · 내용 · Q&A)
 */

import { useRouter } from "next/navigation";
import { GuideMenu } from "@/components/program/GuideMenu";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import type { Program } from "@/data/dummyProgram";
import { GUIDE_SECTIONS, periodLine, scheduleLine, type GuideSection } from "@/data/programGuide";
import { daysBetween, dDayLabel, dotDateToKey, formatKoreanDate, todayKey } from "@/lib/dates";

export function UpcomingProgram({
  program,
  studentName,
  programTitle,
  qs,
  onBack,
}: {
  program: Program;
  studentName: string;
  programTitle: string;
  /** 화면 사이에 넘길 쿼리 (studentName · programTitle · sid) */
  qs: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const first = program.sessions[0];
  const firstKey = first ? dotDateToKey(first.date) : "";
  const days = firstKey ? daysBetween(todayKey(), firstKey) : -1;
  const dDay = days >= 0 ? dDayLabel(days) : "";
  const breaks = program.breaks ?? [];

  const openGuide = (section: GuideSection) =>
    router.push(`/main/program/${program.id}/guide/${section}${qs ? `?${qs}` : ""}`);

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-10">
      <ProgramHeader mode="overview" studentName={studentName} programTitle={programTitle} onBack={onBack} />

      {/* ── 수업 요약 ───────────────────────── */}
      <section
        aria-label="수업 요약"
        className="relative z-10 mx-4 -mt-3 rounded-[20px] border border-violet-200 bg-white p-5 shadow-[0_2px_10px_rgba(124,58,237,0.10)]"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-violet-50 px-[10px] py-[3px] text-[15px] font-bold text-violet-700">
            🗓 수강 예정
          </span>
          {dDay && (
            <span className="rounded-lg bg-brand px-[10px] py-[3px] text-[15px] font-bold text-white">
              첫 수업 {dDay}
            </span>
          )}
        </div>

        <dl className="flex flex-col gap-3">
          <SummaryRow label="기간">
            {periodLine(program)}
            <span className="font-medium text-gray-600"> · 총 {program.totalSessions}회</span>
          </SummaryRow>
          <SummaryRow label="일시">
            {scheduleLine(program)}
            {breaks.map((b) => (
              <span key={b.date} className="block text-[15px] font-semibold text-amber-700">
                ⏸ {formatKoreanDate(dotDateToKey(b.date))} {b.reason}
              </span>
            ))}
          </SummaryRow>
          <SummaryRow label="장소">{program.location}</SummaryRow>
        </dl>
      </section>

      {/* ── 안내 버튼 ───────────────────────── */}
      <h2 className="px-5 pt-5 pb-3 text-[20px] font-extrabold text-gray-900">무엇이 궁금하세요?</h2>
      <div className="px-4">
        <GuideMenu
          sections={GUIDE_SECTIONS.map((s) => s.id)}
          noticeCount={program.notices?.length}
          onOpen={openGuide}
          onContact={() => router.push("/main/faq?tab=chatbot&from=program")}
        />
      </div>
      {program.enrolledAt && (
        <p className="px-5 pt-4 text-center text-[14px] text-gray-500">수강 확정일 {program.enrolledAt}</p>
      )}
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[44px] shrink-0 pt-[1px] text-[16px] text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 text-[18px] font-bold leading-[26px] text-gray-900">{children}</dd>
    </div>
  );
}
