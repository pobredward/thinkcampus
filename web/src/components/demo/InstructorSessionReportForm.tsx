"use client";

import type { InstructorRosterRow } from "@/lib/demoInstructor";

export function InstructorSessionReportForm({
  rows,
  onChange,
}: {
  rows: InstructorRosterRow[];
  onChange: (studentId: string, patch: Partial<InstructorRosterRow>) => void;
}) {
  return (
    <ul className="space-y-4">
      {rows.map((st) => (
        <li key={st.studentId} className="rounded-[16px] border border-line bg-card p-4">
          <p className="font-semibold text-fg">{st.name}</p>
          <p className="text-[12px] text-sub">회차 리포트(sessionReports) 초안 — 센터 검수 후 학부모에게 공개</p>

          <label className="mt-3 block text-[13px] text-sub">
            참여도 (1–5)
            <input
              type="range"
              min={1}
              max={5}
              value={st.participationScore ?? 3}
              onChange={(e) =>
                onChange(st.studentId, { participationScore: Number(e.target.value) })
              }
              className="mt-1 w-full"
            />
            <span className="text-fg font-medium">{st.participationScore ?? 3}</span>
          </label>

          <div className="mt-3 flex gap-2 text-[14px]">
            {[
              { v: true, label: "과제 완료" },
              { v: false, label: "미완료" },
              { v: null, label: "해당 없음" },
            ].map(({ v, label }) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => onChange(st.studentId, { homeworkDone: v })}
                className={`tap rounded-full px-3 py-1.5 ${
                  st.homeworkDone === v ? "bg-gold/20 text-gold font-semibold" : "border border-line text-sub"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-[13px] text-sub">
            한 줄 피드백 (feedback)
            <textarea
              className="mt-1 w-full rounded-lg border border-line bg-elev px-3 py-2 text-[14px] text-fg"
              rows={2}
              placeholder="수업 태도, 발표 내용 등"
              value={st.feedback ?? ""}
              onChange={(e) => onChange(st.studentId, { feedback: e.target.value })}
            />
          </label>

          <label className="mt-2 block text-[13px] text-sub">
            잘한 점 (highlights)
            <input
              className="mt-1 w-full rounded-lg border border-line bg-elev px-3 py-2 text-[14px]"
              placeholder="예: 모둠 토론에서 리더 역할"
              value={st.highlight ?? ""}
              onChange={(e) => onChange(st.studentId, { highlight: e.target.value })}
            />
          </label>
        </li>
      ))}
    </ul>
  );
}
