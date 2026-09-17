"use client";

/**
 * 회차 화면 — 프로그램 Q&A 탭
 * 이 회차에 대한 질문 + 모든 회차 공통 질문 (눌러서 펼치기), 아래에 챗봇·전화 문의
 */

import { useState } from "react";
import Link from "next/link";
import { Collapse } from "@/components/ui/Collapse";
import type { Session } from "@/data/dummyProgram";
import { COMMON_SESSION_QNA } from "@/data/programView";
import { CALL_CENTER_PHONE, CALL_CENTER_TEL } from "@/lib/contact";
import { Card, PanelTitle } from "./parts";

export function QnaPanel({ session }: { session: Session }) {
  const items = [...(session.qna ?? []), ...COMMON_SESSION_QNA];
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <PanelTitle>프로그램 Q&amp;A</PanelTitle>
      <section className="overflow-hidden rounded-[20px] border border-gray-200 bg-white">
        <ul>
          {items.map((it, i) => {
            const expanded = open === i;
            const id = `qna-${session.id}-${i}`;
            return (
              <li key={i} className={i > 0 ? "border-t border-gray-100" : ""}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={id}
                  onClick={() => setOpen(expanded ? null : i)}
                  className="tap flex w-full items-start gap-3 px-5 py-4 text-left"
                >
                  <span className="shrink-0 text-[17px] font-extrabold text-brand">Q</span>
                  <span className="flex-1 text-[17px] font-semibold leading-[25px] text-gray-900">{it.q}</span>
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-[18px] text-gray-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                  >
                    ⌄
                  </span>
                </button>
                <Collapse open={expanded}>
                  <div id={id} className="flex gap-3 px-5 pb-5">
                    <span className="shrink-0 text-[17px] font-extrabold text-green-700">A</span>
                    <p className="flex-1 rounded-2xl bg-gray-50 px-4 py-3 text-[16px] leading-[25px] text-gray-800">
                      {it.a}
                    </p>
                  </div>
                </Collapse>
              </li>
            );
          })}
        </ul>
      </section>

      <Card title="더 궁금한 점이 있으신가요?" icon="🙋">
        <div className="flex gap-2">
          <Link
            href="/main/faq?tab=chatbot&from=session"
            className="tap flex-1 rounded-2xl bg-brand py-4 text-center text-[16px] font-bold text-white"
          >
            🤖 챗봇에게 묻기
          </Link>
          <a
            href={CALL_CENTER_TEL}
            className="tap flex-1 rounded-2xl border border-gray-200 bg-white py-4 text-center text-[16px] font-bold text-gray-800"
          >
            📞 전화 문의
          </a>
        </div>
        <p className="mt-3 text-center text-[15px] text-gray-600">
          {CALL_CENTER_PHONE} · 평일 09:00~18:00
        </p>
      </Card>
    </>
  );
}
