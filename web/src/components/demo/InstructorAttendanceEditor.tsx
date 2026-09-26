"use client";

import type { InstructorAttendance, InstructorRosterRow } from "@/lib/demoInstructor";

const OPTIONS: { value: InstructorAttendance; label: string }[] = [
  { value: "present", label: "출석" },
  { value: "late", label: "지각" },
  { value: "absent", label: "결석" },
];

export function InstructorAttendanceEditor({
  rows,
  onChange,
}: {
  rows: InstructorRosterRow[];
  onChange: (studentId: string, patch: Partial<InstructorRosterRow>) => void;
}) {
  return (
    <ul className="space-y-3">
      {rows.map((st) => (
        <li key={st.studentId} className="rounded-[16px] border border-line bg-card p-4">
          <p className="font-semibold text-fg">{st.name}</p>
          <p className="mt-1 text-[12px] text-sub">추후 자동 출결 연동 전까지 강사가 직접 선택합니다.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPTIONS.map((opt) => {
              const on = st.attendance === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange(st.studentId, { attendance: opt.value })}
                  className={`tap rounded-full px-4 py-2 text-[14px] font-semibold ${
                    on ? "bg-gold text-bg" : "border border-line bg-elev text-sub"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {st.attendance === "late" && (
            <label className="mt-3 flex items-center gap-2 text-sm text-fg2">
              지각
              <input
                type="number"
                min={1}
                max={120}
                className="w-16 rounded border border-line bg-elev px-2 py-1"
                value={st.lateMinutes ?? 5}
                onChange={(e) =>
                  onChange(st.studentId, { lateMinutes: Number(e.target.value) || 5 })
                }
              />
              분
            </label>
          )}
        </li>
      ))}
    </ul>
  );
}
