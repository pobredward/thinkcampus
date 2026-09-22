"use client";

/**
 * 프로그램 안내 — 프로그램 일시 및 장소
 * /main/program/[programId]/guide/schedule
 *
 *   [일시]              요일·시간 (크게) · 기간 · 총 회차 · 휴강일 · 대상/정원
 *   [장소 · 오시는 길]  장소 (크게) · 지도에서 길찾기 · 주차 · 도착하면 · 데려갈 때 …
 *   (회차별 날짜는 두지 않는다 — 날짜는 회차 버튼을 눌러 회차 화면에서)
 */

import { GuidePage } from "@/components/program/GuidePage";
import { Card, InfoRow } from "@/components/program/session/parts";
import type { Program } from "@/data/dummyProgram";
import { mapSearchUrl, periodLine, scheduleLine } from "@/data/programGuide";
import { buildTimeline } from "@/data/programView";
import { formatKoreanDate } from "@/lib/dates";

export default function GuideSchedulePage() {
  return <GuidePage section="schedule">{({ program }) => <ScheduleSection program={program} />}</GuidePage>;
}

function ScheduleSection({ program }: { program: Program }) {
  const breaks = buildTimeline(program).filter((e) => e.kind === "break");
  const directions = program.directions ?? [];

  return (
    <>
      <Card title="일시">
        <p className="text-[22px] font-extrabold leading-[30px] tracking-[-0.01em] text-fg">{scheduleLine(program)}</p>
        <p className="mt-1 text-[17px] text-sub">
          {periodLine(program)} · 총 {program.totalSessions}회
        </p>
        {breaks.map((b) => (
          <p key={b.key} className="mt-3 rounded-xl bg-elev px-4 py-3 text-[16px] font-semibold text-fg2">
            {formatKoreanDate(b.key)} · {b.kind === "break" ? b.reason : ""}
          </p>
        ))}
        <div className="mt-4">
          <InfoRow label="대상">
            {program.targetGrade} · 정원 {program.maxStudents}명
          </InfoRow>
        </div>
      </Card>

      <Card title="장소 · 오시는 길">
        <p className="text-[19px] font-bold leading-[28px] text-fg">{program.location}</p>
        <a
          href={mapSearchUrl(program)}
          target="_blank"
          rel="noopener noreferrer"
          className="tap mt-4 flex items-center justify-center gap-2 rounded-2xl border border-gold-dim bg-gold-light py-[14px] text-[17px] font-bold text-gold"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
            <circle cx="12" cy="10" r="2.4" />
          </svg>
          지도에서 길찾기
        </a>
        {directions.length > 0 && (
          <ul className="mt-5">
            {directions.map((d) => (
              <li key={d.label} className="border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
                <p className="text-[15px] font-bold text-gold">{d.label}</p>
                <p className="mt-1 text-[17px] leading-[26px] text-fg2">{d.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
