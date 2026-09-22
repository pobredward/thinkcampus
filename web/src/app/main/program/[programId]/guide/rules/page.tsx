"use client";

/**
 * 프로그램 안내 — 수업 규정·지침 (프로그램에 규정이 없으면 기본 규정 — data/programGuide.ts)
 * /main/program/[programId]/guide/rules (상단 경로: 홈 › 프로그램 › 수업 규정·지침)
 */

import { GuidePage } from "@/components/program/GuidePage";
import type { Program } from "@/data/dummyProgram";
import { programRules } from "@/data/programGuide";

export default function GuideRulesPage() {
  return <GuidePage section="rules">{({ program }) => <RulesSection program={program} />}</GuidePage>;
}

function RulesSection({ program }: { program: Program }) {
  const rules = programRules(program);
  return (
    <>
      <p role="note" className="rounded-2xl border border-danger-border bg-danger-bg px-4 py-4 text-[17px] leading-[26px] text-danger">
        <b>반드시 지켜 주세요.</b> 지키지 않으면 수강이 취소되거나 수료증이 발급되지 않을 수 있어요.
      </p>
      <ol className="flex flex-col gap-3">
        {rules.map((r, i) => (
          <li
            key={i}
            className={`rounded-[20px] border bg-card p-5 ${r.important ? "border-danger-border" : "border-line"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              {r.important && (
                <span className="rounded-md bg-danger px-2 py-[1px] text-[14px] font-bold text-fg">필수</span>
              )}
              <h2 className={`text-[18px] font-extrabold leading-[26px] ${r.important ? "text-danger" : "text-fg"}`}>
                {r.title}
              </h2>
            </div>
            <p className="mt-2 text-[16px] leading-[25px] text-fg2">{r.body}</p>
          </li>
        ))}
      </ol>
    </>
  );
}
