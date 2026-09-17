"use client";

/**
 * 프로그램 안내 — 자주 묻는 질문 (프로그램 질문 먼저, 그다음 기본 질문: 준비물 · 지각·결석 · 모임·픽업 · 간식 · 점심)
 * /main/program/[programId]/guide/qna — 질문을 누르면 답이 펼쳐진다
 */

import { useState } from "react";
import Link from "next/link";
import { GuidePage } from "@/components/program/GuidePage";
import { Card } from "@/components/program/session/parts";
import { Collapse } from "@/components/ui/Collapse";
import type { Program } from "@/data/dummyProgram";
import { programFaq } from "@/data/programGuide";
import { CALL_CENTER_PHONE, CALL_CENTER_TEL } from "@/lib/contact";

export default function GuideQnaPage() {
  return <GuidePage section="qna">{({ program }) => <QnaSection program={program} />}</GuidePage>;
}

function QnaSection({ program }: { program: Program }) {
  const items = programFaq(program);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <section aria-label="자주 묻는 질문 목록" className="overflow-hidden rounded-[20px] border border-gray-200 bg-white">
        <ul>
          {items.map((it, i) => {
            const expanded = open === i;
            const id = `guide-qna-${i}`;
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
                  <span className="flex-1">
                    <span className="mb-1 inline-block rounded-md bg-gray-100 px-2 py-[1px] text-[14px] font-semibold text-gray-600">
                      {it.topic}
                    </span>
                    <span className="block text-[17px] font-semibold leading-[25px] text-gray-900">{it.q}</span>
                  </span>
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
            href="/main/faq?tab=chatbot&from=program"
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
        <p className="mt-3 text-center text-[15px] text-gray-600">{CALL_CENTER_PHONE} · 평일 09:00~18:00</p>
      </Card>
    </>
  );
}
