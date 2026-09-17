/**
 * 회차 화면 — 출결 탭
 */

import { type DayItem, type DayStatus, type ProgressSummary } from "@/data/programView";
import { formatKoreanDate } from "@/lib/dates";
import { Card, InfoRow, Note, PanelTitle } from "./parts";

const STATUS_LOOK: Record<DayStatus, { icon: string; box: string; text: string; title: string }> = {
  present: { icon: "✅", box: "bg-green-50", text: "text-green-700", title: "출석" },
  late: { icon: "⏰", box: "bg-amber-50", text: "text-amber-700", title: "지각" },
  absent: { icon: "❌", box: "bg-red-50", text: "text-red-600", title: "결석" },
  upcoming: { icon: "🗓️", box: "bg-brand-light", text: "text-brand", title: "수업 전" },
  cancelled: { icon: "🚫", box: "bg-gray-100", text: "text-gray-600", title: "휴강" },
};

export function AttendancePanel({ item, summary }: { item: DayItem; summary: ProgressSummary }) {
  const { session, record, status } = item;
  const look = STATUS_LOOK[status];

  const subline =
    status === "present"
      ? record?.checkinTime
        ? `${record.checkinTime} 입실`
        : "수업에 참여했어요"
      : status === "late"
        ? [record?.checkinTime && `${record.checkinTime} 입실`, record?.lateMinutes != null && `${record.lateMinutes}분 늦음`]
            .filter(Boolean)
            .join(" · ")
        : status === "absent"
          ? "이 날은 수업에 참여하지 않았어요"
          : status === "upcoming"
            ? "수업 당일 입실하면 기록돼요"
            : "이 날은 수업이 없어요";

  return (
    <>
      <PanelTitle>출결</PanelTitle>
      <Card>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[30px] ${look.box}`}
          >
            {look.icon}
          </span>
          <div className="min-w-0">
            <p className={`text-[26px] font-extrabold leading-[34px] ${look.text}`}>{look.title}</p>
            <p className="text-[17px] text-gray-700">{subline}</p>
          </div>
        </div>

        <div className="mt-5">
          <InfoRow label="수업일">
            {formatKoreanDate(item.key)} · {session.startTime}–{session.endTime}
          </InfoRow>
          <InfoRow label="강사">{session.instructor.name} 강사</InfoRow>
          {status === "cancelled" && session.cancelReason && <InfoRow label="사유">{session.cancelReason}</InfoRow>}
          {status === "cancelled" && session.makeUpDate && <InfoRow label="보강">{session.makeUpDate}</InfoRow>}
        </div>
      </Card>

      {status === "absent" && <Note tone="amber">빠진 수업의 소개와 자료는 ‘내용’ 탭에서 볼 수 있어요.</Note>}

      <Card title="이 프로그램 출결" icon="📋">
        <p className="text-[16px] text-gray-600">
          지금까지 {summary.done}회 / 전체 {summary.total}회
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Count label="출석" value={summary.present} cls="bg-green-50 text-green-700" />
          <Count label="지각" value={summary.late} cls="bg-amber-50 text-amber-700" />
          <Count label="결석" value={summary.absent} cls="bg-red-50 text-red-600" />
        </div>
      </Card>
    </>
  );
}

function Count({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`rounded-2xl py-3 ${cls}`}>
      <p className="text-[15px] font-semibold">{label}</p>
      <p className="text-[24px] font-extrabold leading-[30px]">{value}</p>
    </div>
  );
}
