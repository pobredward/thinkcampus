"use client";

import type { ProgramSectionDto } from "@/lib/centerSummary";

export function CenterSectionChips({
  sections,
  value,
  onChange,
  totalStudents,
}: {
  sections: ProgramSectionDto[];
  value: string;
  onChange: (sectionId: string) => void;
  totalStudents?: number;
}) {
  const chips = [{ id: "all", label: "전체", studentCount: totalStudents ?? 0 }, ...sections];

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {chips.map((s) => {
        const on = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
              on ? "border-gold bg-gold/10 text-gold" : "border-line bg-elev text-sub"
            }`}
          >
            {s.label}
            {s.studentCount > 0 && (
              <span className="ml-1 text-[11px] font-medium opacity-80">{s.studentCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
