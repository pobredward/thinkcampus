/**
 * 회차 화면 — 프로그램 일정 탭 (언제 · 어디서 · 무엇을 챙기고 · 어떤 순서로)
 */

import type { DayItem } from "@/data/programView";
import { daysBetween, dDayLabel, formatKoreanDate } from "@/lib/dates";
import { Card, InfoRow, Note, Numbered, PanelTitle } from "./parts";

export function SchedulePanel({ item, today }: { item: DayItem; today: string }) {
  const { session, status } = item;
  const dDay = status === "upcoming" ? dDayLabel(daysBetween(today, item.key)) : "";

  return (
    <>
      <PanelTitle>프로그램 일정</PanelTitle>
      {status === "cancelled" && (
        <Note>
          이 회차는 휴강이에요{session.cancelReason ? ` (${session.cancelReason})` : ""}.
          {session.makeUpDate && ` 보강은 ${session.makeUpDate}에 진행돼요.`}
        </Note>
      )}

      <Card title="수업 일정" icon="📅">
        <InfoRow label="날짜">
          <span className="font-bold">{formatKoreanDate(item.key)}</span>
          {dDay && (
            <span className="ml-2 rounded-lg bg-brand px-2 py-[2px] text-[15px] font-bold text-ink">{dDay}</span>
          )}
        </InfoRow>
        <InfoRow label="시간">
          <span className="font-bold">
            {session.startTime}–{session.endTime}
          </span>
          <span className="block text-[15px] text-sub">
            {session.durationMinutes}분 · {session.sessionHours}차시
          </span>
        </InfoRow>
        <InfoRow label="장소">{session.location}</InfoRow>
        <InfoRow label="강사">{session.instructor.name} 강사</InfoRow>
      </Card>

      <Card title="준비물" icon="🎒">
        {session.materials.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {session.materials.map((m, i) => (
              <span
                key={i}
                className="rounded-full border border-line bg-elev px-4 py-[7px] text-[16px] font-semibold text-gold"
              >
                {m}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[16px] text-sub">따로 챙길 준비물은 없어요.</p>
        )}
      </Card>

      {session.curriculum.length > 0 && (
        <Card title="진행 순서" icon="⏱️">
          <Numbered items={session.curriculum} />
        </Card>
      )}
    </>
  );
}
