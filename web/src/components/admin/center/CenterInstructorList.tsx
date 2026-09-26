"use client";

import Link from "next/link";
import { StaffPhoto } from "@/components/students/StudentPhoto";
import type { DemoInstructorProfile } from "@/lib/demoInstructorStaff";

export function CenterInstructorList({
  instructors,
  basePath,
  sessionsThisWeek,
}: {
  instructors: DemoInstructorProfile[];
  basePath: string;
  sessionsThisWeek?: Record<string, number>;
}) {
  return (
    <ul className="space-y-2">
      {instructors.map((ins) => (
        <li key={ins.staffId}>
          <Link
            href={`${basePath}/instructors/${ins.staffId}`}
            className="tap flex items-center gap-3 rounded-xl border border-line bg-card p-4"
          >
            <StaffPhoto staffId={ins.staffId} name={ins.name} size={56} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-fg">{ins.name}</p>
              <p className="truncate text-sm text-sub">{ins.email}</p>
              <p className="mt-0.5 text-[12px] text-sub">
                이번 주 회차 {sessionsThisWeek?.[ins.staffId] ?? "—"}건 · {ins.specialties.join(", ")}
              </p>
            </div>
            <span className="text-gold">›</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
