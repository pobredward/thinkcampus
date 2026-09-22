"use client";

/**
 * 프로그램 안내 — 자주 묻는 질문 (프로그램 질문 먼저, 그다음 기본 질문: 준비물 · 지각·결석 · 모임·픽업 · 간식 · 점심)
 * /main/program/[programId]/guide/qna — 질문을 누르면 답이 펼쳐진다
 */

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { faqHref } from "@/lib/crumbs";
import { GuidePage } from "@/components/program/GuidePage";
import { Card } from "@/components/program/session/parts";
import { Collapse } from "@/components/ui/Collapse";
import type { Program } from "@/data/dummyProgram";
import { programFaq } from "@/data/programGuide";

export default function GuideQnaPage() {
  return (
    <GuidePage section="qna">{({ program, programId }) => <QnaSection program={program} programId={programId} />}</GuidePage>
  );
}

function QnaSection({ program, programId }: { program: Program; programId: string }) {
  const sp = useSearchParams();
  const items = programFaq(program);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <section aria-label="자주 묻는 질문 목록" className="overflow-hidden rounded-[20px] border border-line bg-card">
        <ul>
          {items.map((it, i) => {
            const expanded = open === i;
            const id = `guide-qna-${i}`;
            return (
              <li key={i} className={i > 0 ? "border-t border-line" : ""}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={id}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="tap flex w-full items-start gap-3 px-5 py-4 text-left"
                >
                  <span className="shrink-0 text-[17px] font-extrabold text-gold">Q</span>
                  <span className="flex-1">
                    <span className="mb-1 inline-block rounded-md bg-elev px-2 py-[1px] text-[14px] font-semibold text-sub">
                      {it.topic}
                    </span>
                    <span className="block text-[17px] font-semibold leading-[25px] text-fg">{it.q}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-[18px] text-sub transition-transform ${expanded ? "rotate-180" : ""}`}
                  >
                    ⌄
                  </span>
                </button>
                <Collapse open={expanded}>
                  <div id={id} className="flex gap-3 px-5 pb-5">
                    <span className="shrink-0 text-[17px] font-extrabold text-sub">A</span>
                    <p className="flex-1 rounded-2xl bg-elev px-4 py-3 text-[16px] leading-[25px] text-fg2">
                      {it.a}
                    </p>
                  </div>
                </Collapse>
              </li>
            );
          })}
        </ul>
      </section>

      <Card title="더 궁금한 점이 있으신가요?">
        <Link
          href={faqHref({ from: "program", programId, sp })}
          className="tap block w-full rounded-2xl bg-brand py-4 text-center text-[17px] font-bold text-ink"
        >
          챗봇에게 물어보기
        </Link>
        <p className="mt-3 text-center text-[15px] leading-[22px] text-sub">
          챗봇으로 해결되지 않으면 상담 전화번호를 안내해 드려요.
        </p>
      </Card>
    </>
  );
}
