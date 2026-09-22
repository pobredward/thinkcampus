"use client";

/**
 * 프로그램 안내 — 공지사항 (+ 매번 챙길 준비물)
 * /main/program/[programId]/guide/notices
 */

import { GuidePage } from "@/components/program/GuidePage";
import { Card } from "@/components/program/session/parts";
import type { Program } from "@/data/dummyProgram";

export default function GuideNoticesPage() {
  return <GuidePage section="notices">{({ program }) => <NoticesSection program={program} />}</GuidePage>;
}

function NoticesSection({ program }: { program: Program }) {
  const notices = program.notices ?? [];
  return (
    <>
      {notices.length === 0 ? (
        <Card>
          <p className="text-[17px] text-fg2">아직 올라온 공지가 없어요.</p>
        </Card>
      ) : (
        <ol className="flex flex-col gap-3">
          {notices.map((n, i) => (
            <li key={i} className="flex gap-3 rounded-[20px] border border-line bg-card p-5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-elev text-[16px] font-extrabold text-gold">
                {i + 1}
              </span>
              <p className="flex-1 pt-[2px] text-[17px] leading-[26px] text-fg">{n}</p>
            </li>
          ))}
        </ol>
      )}
      {!!program.commonMaterials?.length && (
        <Card title="매번 챙길 준비물" icon="🎒">
          <div className="flex flex-wrap gap-2">
            {program.commonMaterials.map((m) => (
              <span
                key={m}
                className="rounded-full border border-line bg-elev px-4 py-[7px] text-[16px] font-semibold text-gold"
              >
                {m}
              </span>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
