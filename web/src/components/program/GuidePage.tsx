"use client";

/**
 * 프로그램 안내 페이지 공통 틀 — 헤더(상단 경로 홈 › 프로그램 › 안내 · 제목 · 필독 배지) + 본문
 * (모바일 components/program/GuideScreen.tsx)
 *
 * 안내 페이지는 서로 독립이다: /main/program/[programId]/guide/{schedule,purpose,notices,rules,qna}
 * 새 안내를 추가할 때 → data/programGuide.ts 에 항목 추가 + guide/<id>/page.tsx 하나 만들기.
 *
 * 쿼리: studentName · programTitle · sid · via
 */

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Program } from "@/data/dummyProgram";
import { guideSection, type GuideSection } from "@/data/programGuide";
import { getDummyProgram } from "@/data/programView";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { guideCrumbs, programQs } from "@/lib/crumbs";
import { usePageTitle } from "@/hooks/usePageTitle";

export interface GuideContext {
  program: Program;
  programId: string;
  /** 회차 화면 등으로 넘길 쿼리 (studentName · programTitle · sid · via) */
  passQs: string;
}

export function GuidePage({
  section,
  children,
}: {
  section: GuideSection;
  children: (ctx: GuideContext) => React.ReactNode;
}) {
  const { programId } = useParams<{ programId: string }>();
  const sp = useSearchParams();

  // TODO: Firestore 에서 programId 기준 조회
  const program = getDummyProgram(programId);
  const programTitle = sp.get("programTitle") ?? program.title;
  const info = guideSection(section);
  usePageTitle(`${info.label} · ${programTitle}`);

  const passQs = useMemo(() => programQs(sp), [sp]);

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10">
      <header className="px-5 pb-5" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs items={guideCrumbs({ programId, programTitle, sp, section })} />
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-[24px] font-extrabold leading-[33px] tracking-[-0.01em] text-fg">
          {info.label}
          {info.badge && (
            <span className="rounded-md border border-gold-dim bg-gold-light px-[9px] py-[2px] text-[14px] font-bold text-gold">
              {info.badge}
            </span>
          )}
        </h1>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-5">{children({ program, programId, passQs })}</div>
    </div>
  );
}
