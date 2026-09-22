"use client";

/**
 * 수강 예정 프로그램 — 수강 중 화면과 같은 구성 (진행·종합 리포트만 없음)
 *
 *   [헤더]         상단 경로 · 학생 · 프로그램명 · 첫 수업 D-day
 *   [규정·지침]    수업 규정·지침(필독) 버튼 하나 — 맨 위에 따로
 *   [수업 안내]    일시 및 장소 · 목적 및 내용 · 공지사항 · 자주 묻는 질문
 *   [회차별 수업]  1회차 ~ 6회차 (누르면 일정 · 내용 · Q&A)
 */

import { GuideMenu, MenuRow } from "@/components/program/GuideMenu";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import { SectionHeading } from "@/components/program/SectionHeading";
import { SessionGrid } from "@/components/program/SessionGrid";
import type { Program } from "@/data/dummyProgram";
import { GUIDE_MENU_SECTIONS, GUIDE_TOP_SECTION, guideSection, type GuideSection } from "@/data/programGuide";
import type { Crumb } from "@/components/ui/Breadcrumbs";
import type { DayItem } from "@/data/programView";
import { daysBetween, dDayLabel, dotDateToKey, todayKey } from "@/lib/dates";

export function UpcomingProgram({
  program,
  studentName,
  programTitle,
  items,
  onOpenGuide,
  onOpenSession,
  crumbs,
}: {
  program: Program;
  studentName: string;
  programTitle: string;
  items: DayItem[];
  onOpenGuide: (section: GuideSection) => void;
  onOpenSession: (item: DayItem) => void;
  crumbs: Crumb[];
}) {
  const first = program.sessions[0];
  const firstKey = first ? dotDateToKey(first.date) : "";
  const days = firstKey ? daysBetween(todayKey(), firstKey) : -1;
  const dDay = days >= 0 ? dDayLabel(days) : "";

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10">
      <ProgramHeader
        mode="overview"
        studentName={studentName}
        programTitle={programTitle}
        badge="수강 예정"
        note={dDay ? `첫 수업 ${dDay}` : undefined}
        crumbs={crumbs}
      />

      <div className="px-4">
        <div className="overflow-hidden rounded-[18px] border border-gold-dim bg-card">
          <MenuRow
            label={guideSection(GUIDE_TOP_SECTION).label}
            badge={guideSection(GUIDE_TOP_SECTION).badge}
            onClick={() => onOpenGuide(GUIDE_TOP_SECTION)}
          />
        </div>
      </div>

      <section aria-labelledby="guide-title" className="px-4 pt-7">
        <SectionHeading id="guide-title">수업 안내</SectionHeading>
        <GuideMenu sections={GUIDE_MENU_SECTIONS} onOpen={onOpenGuide} />
      </section>

      <section aria-labelledby="sessions-title" className="px-4 pt-7">
        <SectionHeading id="sessions-title" right={`총 ${program.totalSessions}회`}>
          회차별 수업
        </SectionHeading>
        <SessionGrid items={items} next={null} onOpen={onOpenSession} />
      </section>

      {program.enrolledAt && (
        <p className="px-5 pt-6 text-center text-[14px] text-faint">수강 확정일 {program.enrolledAt}</p>
      )}
    </div>
  );
}
