"use client";

/**
 * 프로그램 화면 — 첫 화면은 최대한 깔끔하게 (제목이 내용에 묻히지 않게)
 *
 *   [헤더]         상단 경로(홈 › 프로그램) · 학생 · 프로그램명
 *   [규정·지침]    수업 규정·지침(필독) 버튼 하나 — 맨 위에 따로
 *   [수업 안내]    프로그램 일시 및 장소 · 프로그램 목적 및 내용 · 공지사항 · 자주 묻는 질문 — 한 줄에 하나씩
 *   [회차별 수업]  1회차 ~ 6회차 (회차만 — 날짜·시간·출결은 눌러서 회차 화면에서)
 *   [종합 리포트]  모든 회차가 끝나면 열림
 *
 * 회차 버튼을 누르면 → /main/program/[programId]/session/[sessionId]
 * 수강 예정 프로그램(status: upcoming)은 같은 구성의 UpcomingProgram 을 보여 준다.
 *
 * 쿼리스트링: studentName · programTitle · sid(학생 id)
 */

import { useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GuideMenu, MenuRow } from "@/components/program/GuideMenu";
import { ProgramHeader } from "@/components/program/ProgramHeader";
import { SectionHeading } from "@/components/program/SectionHeading";
import { SessionGrid } from "@/components/program/SessionGrid";
import { UpcomingProgram } from "@/components/program/UpcomingProgram";
import { GUIDE_MENU_SECTIONS, GUIDE_TOP_SECTION, guideSection, type GuideSection } from "@/data/programGuide";
import {
  buildDayItems,
  getDummyProgram,
  isProgramFinished,
  isUpcomingProgram,
  nextUpcoming,
  pickDummyAttendance,
  summarize,
  type DayItem,
} from "@/data/programView";
import { programCrumbs } from "@/lib/crumbs";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ProgramSessionsPage() {
  const { programId } = useParams<{ programId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const studentName = sp.get("studentName") ?? "";
  const sid = sp.get("sid");

  // TODO: Firestore 에서 programId / studentId 기준 조회
  const program = getDummyProgram(programId);
  const programTitle = sp.get("programTitle") ?? program.title;
  usePageTitle(programTitle);

  const attendance = useMemo(() => pickDummyAttendance(sid), [sid]);
  const items = useMemo(() => buildDayItems(program, attendance), [program, attendance]);
  const qs = sp.toString();

  const openGuide = (section: GuideSection) =>
    router.push(`/main/program/${programId}/guide/${section}${qs ? `?${qs}` : ""}`);
  const openSession = (d: DayItem) =>
    router.push(`/main/program/${programId}/session/${d.session.id}${qs ? `?${qs}` : ""}`);

  // 수강 예정 — 같은 구성 (진행·리포트 없이)
  if (isUpcomingProgram(program)) {
    return (
      <UpcomingProgram
        program={program}
        studentName={studentName}
        programTitle={programTitle}
        items={items}
        onOpenGuide={openGuide}
        onOpenSession={openSession}
        crumbs={programCrumbs({ programId, programTitle, sp, current: true })}
      />
    );
  }

  const summary = summarize(items, program.totalSessions);
  const next = nextUpcoming(items);
  const finished = isProgramFinished(items);
  const openReport = () => router.push(`/main/program/${programId}/report${qs ? `?${qs}` : ""}`);

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10">
      <ProgramHeader
        mode="overview"
        studentName={studentName}
        programTitle={programTitle}
        crumbs={programCrumbs({ programId, programTitle, sp, current: true })}
      />

      {/* ── 수업 규정·지침 (필독 · 맨 위) ──────────── */}
      <div className="px-4">
        <div className="overflow-hidden rounded-[18px] border border-gold-dim bg-card">
          <MenuRow
            label={guideSection(GUIDE_TOP_SECTION).label}
            badge={guideSection(GUIDE_TOP_SECTION).badge}
            onClick={() => openGuide(GUIDE_TOP_SECTION)}
          />
        </div>
      </div>

      {/* ── 수업 안내 ─────────────────────────── */}
      <section aria-labelledby="guide-title" className="px-4 pt-7">
        <SectionHeading id="guide-title">수업 안내</SectionHeading>
        <GuideMenu sections={GUIDE_MENU_SECTIONS} onOpen={openGuide} />
      </section>

      {/* ── 회차별 수업 ───────────────────────── */}
      <section aria-labelledby="sessions-title" className="px-4 pt-7">
        <SectionHeading id="sessions-title" right={`총 ${summary.total}회 · 진행 ${summary.done}회`}>
          회차별 수업
        </SectionHeading>
        <SessionGrid items={items} next={next} onOpen={openSession} />
      </section>

      {/* ── 종합 리포트 ───────────────────────── */}
      <div className="mx-4 mt-7">
        {finished ? (
          <button
            type="button"
            onClick={openReport}
            className="tap w-full rounded-2xl bg-gold py-[18px] text-center text-[17px] font-bold tracking-[0.01em] text-ink"
          >
            종합 리포트 보기
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-line2 bg-card2 px-5 py-4">
            <p className="text-[17px] font-bold text-fg2">종합 리포트</p>
            <p className="mt-1 text-[16px] leading-[24px] text-sub">
              {summary.total}회 수업이 모두 끝나면 열려요. 회차별 리포트는 각 회차에서 볼 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
