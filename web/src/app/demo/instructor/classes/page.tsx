"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_INSTRUCTOR_CLASS, DEMO_INSTRUCTOR_SESSIONS } from "@/lib/demoInstructor";
import { DEMO_ROLE_PATH } from "@/lib/demoPortal";

const STATUS_LABEL = { done: "완료", today: "오늘", upcoming: "예정" } as const;

export default function InstructorClassesPage() {
  usePageTitle("담당 반");

  return (
    <div className="flex flex-1 flex-col px-5 pb-8" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
      <h1 className="text-[24px] font-bold text-fg">회차별 수업</h1>
      <p className="mt-2 text-[15px] text-sub">{DEMO_INSTRUCTOR_CLASS.title}</p>

      <ul className="mt-6 space-y-2">
        {DEMO_INSTRUCTOR_SESSIONS.map((s) => (
          <li key={s.id}>
            <Link
              href={`${DEMO_ROLE_PATH.instructor}/session/${s.id}`}
              className="tap flex items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-4"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  s.status === "today" ? "bg-gold/20 text-gold" : "bg-elev text-fg2"
                }`}
              >
                {s.sessionNumber}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-fg">{s.topic}</p>
                <p className="text-sm text-sub">{s.date}</p>
              </div>
              <span className="shrink-0 text-xs font-medium text-sub">{STATUS_LABEL[s.status]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
