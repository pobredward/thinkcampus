"use client";

/**
 * 회차 화면 — 프로그램 Q&A 탭
 * 이 회차에 대한 질문 + 모든 회차 공통 질문 (눌러서 펼치기), 아래에 챗봇 (전화는 챗봇에서 해결되지 않을 때 안내)
 */

import { useState } from "react";
import Link from "next/link";
import { Collapse } from "@/components/ui/Collapse";
import type { Session } from "@/data/dummyProgram";
import { COMMON_SESSION_QNA } from "@/data/programView";
import { Card, PanelTitle } from "./parts";

export function QnaPanel({ session, chatbotHref }: { session: Session; chatbotHref: string }) {
  const items = [...(session.qna ?? []), ...COMMON_SESSION_QNA];
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <PanelTitle>프로그램 Q&amp;A</PanelTitle>
      <section className="overflow-hidden rounded-[20px] border border-line bg-card">
        <ul>
          {items.map((it, i) => {
            const expanded = open === i;
            const id = `qna-${session.id}-${i}`;
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
                  <span className="flex-1 text-[17px] font-semibold leading-[25px] text-fg">{it.q}</span>
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
          href={chatbotHref}
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
