"use client";

/**
 * 프로그램 안내 페이지 공통 틀 — 파란 헤더(← 돌아가기 · 프로그램명 · 제목) + 본문
 * (모바일 components/program/GuideScreen.tsx)
 *
 * 안내 페이지는 서로 독립이다: /main/program/[programId]/guide/{purpose,sessions,notices,rules,qna}
 * 새 안내를 추가할 때 → data/programGuide.ts 에 항목 추가 + guide/<id>/page.tsx 하나 만들기.
 *
 * 쿼리: studentName · programTitle · sid · from(home 이면 "← 홈")
 */

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { Program } from "@/data/dummyProgram";
import { guideSection, type GuideSection } from "@/data/programGuide";
import { getDummyProgram, isUpcomingProgram } from "@/data/programView";
import { useUpTo } from "@/hooks/useBack";
import { usePageTitle } from "@/hooks/usePageTitle";

// 회차 화면을 다녀와도 들어온 곳(프로그램 화면·홈)으로 한 번에 돌아간다
const SKIP_PATH = /^\/main\/program\/[^/]+\/(guide|session)\//;

export interface GuideContext {
  program: Program;
  programId: string;
  /** 회차 화면 등으로 넘길 쿼리 (from 제외) */
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
  const fromHome = sp.get("from") === "home";
  const info = guideSection(section);
  usePageTitle(`${info.label} · ${programTitle}`);

  const qs = sp.toString();
  const goBack = useUpTo(fromHome ? "/main" : `/main/program/${programId}${qs ? `?${qs}` : ""}`, {
    skip: SKIP_PATH,
  });
  const backLabel = fromHome ? "홈" : isUpcomingProgram(program) ? "프로그램 안내" : "프로그램";

  const passQs = useMemo(() => {
    const p = new URLSearchParams(qs);
    p.delete("from");
    return p.toString();
  }, [qs]);

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-10">
      <header className="bg-brand px-5 pb-5" style={{ paddingTop: "calc(var(--sat) + 10px)" }}>
        <button type="button" onClick={goBack} className="tap -ml-1 py-1 pr-2 text-[16px] font-medium text-blue-100">
          ← {backLabel}
        </button>
        <p className="mt-2 line-clamp-2 text-[15px] leading-[22px] text-blue-100">{programTitle}</p>
        <h1 className="mt-1 text-[24px] font-extrabold leading-[32px] text-white">
          <span aria-hidden="true">{info.icon} </span>
          {info.label}
        </h1>
      </header>

      <div className="flex flex-col gap-3 px-4 pt-5">{children({ program, programId, passQs })}</div>
    </div>
  );
}
