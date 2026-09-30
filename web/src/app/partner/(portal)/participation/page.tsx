"use client";

/**
 * 발주처 · 참여 — 반별 출석률 + 학생 × 회차 출결표 (출 · 지 · 결)
 * 학생 이름은 운영 건 설정에 따라 가려진다 ("김○준"). 연락처 · 생년월일은 없다.
 */

import { useMemo, useState } from "react";
import { dayLabel, rateText } from "@/components/partner/parts";
import { ChipRow, Empty, ErrorBox, inputClass, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { useApi, useQuery, type AttendanceStatus } from "@/services";

const MARK: Record<AttendanceStatus, { t: string; c: string; label: string }> = {
  present: { t: "출", c: "text-fg", label: "출석" },
  late: { t: "지", c: "text-late", label: "지각" },
  absent: { t: "결", c: "text-danger", label: "결석" },
};

export default function PartnerParticipationPage() {
  usePageTitle("참여");
  const api = useApi();
  const { selectedRun } = usePartnerRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.partner.getParticipation(runId) : null), [api, runId]);
  const [section, setSection] = useState("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    if (!data) return [];
    const label = data.sections.find((s) => s.id === section)?.label;
    return data.students.filter((s) => (section === "all" || s.sectionLabel === label) && (!q.trim() || s.name.includes(q.trim())));
  }, [data, section, q]);

  if (!selectedRun) return <Loading />;
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div>
      <PageTitle title="학생 참여" desc={`${data.students.length}명 · ${data.masked ? "이름 일부를 가려서 보여 드려요" : "출석 · 지각 · 결석"}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {data.sections.map((s) => (
          <div key={s.id} className="rounded-[16px] border border-line bg-card px-4 py-3">
            <p className="text-[15px] font-bold text-fg">{s.label}</p>
            <p className="mt-1 text-[14px] text-sub">
              {s.studentCount}명 · 출석률 <b className="text-gold">{rateText(s.rate)}</b>
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center">
        <div className="min-w-0 flex-1">
          <ChipRow label="반" value={section} onChange={setSection} items={[{ id: "all", label: "전체" }, ...data.sections.map((s) => ({ id: s.id, label: s.label }))]} />
        </div>
        <label htmlFor="pp-q" className="sr-only">
          이름 찾기
        </label>
        <input id="pp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 찾기" className={`${inputClass} md:w-56`} />
      </div>
      <p className="mt-2 text-[14px] text-sub">
        표시 — <b className="text-fg">출</b> 출석 · <b className="text-late">지</b> 지각 · <b className="text-danger">결</b> 결석 · <span className="text-faint">·</span> 수업 전/미입력
      </p>

      {rows.length === 0 ? (
        <div className="mt-3">
          <Empty title="해당하는 학생이 없어요" />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-[18px] border border-line bg-card">
          <table className="w-full min-w-[640px] border-collapse text-left" data-testid="participation-table">
            <thead>
              <tr className="border-b border-line text-[14px] text-sub">
                <th className="sticky left-0 bg-card px-4 py-3 font-semibold">학생</th>
                <th className="px-2 py-3 font-semibold">반</th>
                {data.sessions.map((s) => (
                  <th key={s.sessionNumber} className="px-2 py-3 text-center font-semibold">
                    {s.sessionNumber}회
                    <span className="block text-[14px] font-normal text-faint">{dayLabel(s.date)}</span>
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-semibold">출석</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.studentId} className="border-b border-line text-[15px] last:border-b-0">
                  <td className="sticky left-0 bg-card px-4 py-2 font-semibold text-fg">{s.name}</td>
                  <td className="px-2 py-2 text-sub">{s.sectionLabel}</td>
                  {s.statuses.map((st, i) => (
                    <td key={i} className="px-2 py-2 text-center">
                      {st ? (
                        <span className={`font-bold ${MARK[st].c}`} aria-label={MARK[st].label}>
                          {MARK[st].t}
                        </span>
                      ) : (
                        <span className="text-faint" aria-label="기록 없음">
                          ·
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right text-fg2">
                    {s.present + s.late}/{s.present + s.late + s.absent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
