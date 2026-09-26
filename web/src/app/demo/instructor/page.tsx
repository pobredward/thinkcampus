"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  DEMO_INSTRUCTOR_CLASS,
  DEMO_INSTRUCTOR_SESSIONS,
} from "@/lib/demoInstructor";
import { DEMO_ROLE_PATH } from "@/lib/demoPortal";
import { useAuth } from "@/providers/AuthProvider";

export default function InstructorDemoHomePage() {
  usePageTitle("강사 · 오늘");
  const { user } = useAuth();
  const today = DEMO_INSTRUCTOR_SESSIONS.find((s) => s.status === "today");
  const upcoming = DEMO_INSTRUCTOR_SESSIONS.filter((s) => s.status === "upcoming").slice(0, 2);

  return (
    <div className="flex flex-1 flex-col px-5 pb-8" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
      <p className="text-sm text-sub">담당 강사</p>
      <h1 className="mt-1 text-[26px] font-bold text-fg">{user?.displayName ?? "박강사"} 선생님</h1>
      <p className="mt-2 text-[15px] text-fg2">{DEMO_INSTRUCTOR_CLASS.campusName} · {DEMO_INSTRUCTOR_CLASS.schedule}</p>

      <section className="mt-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-gold">오늘 수업</h2>
        {today ? (
          <Link
            href={`${DEMO_ROLE_PATH.instructor}/session/${today.id}`}
            className="tap mt-3 block rounded-[20px] border border-gold/40 bg-card p-5 shadow-sm"
          >
            <p className="text-[13px] font-semibold text-gold">{today.sessionNumber}회차</p>
            <p className="mt-1 text-[20px] font-bold text-fg">{today.topic}</p>
            <p className="mt-2 text-[15px] text-sub">{today.date} · {today.location}</p>
            <span className="mt-4 inline-block text-sm font-semibold text-gold">출결·수업 화면 →</span>
          </Link>
        ) : (
          <p className="mt-3 rounded-xl border border-line bg-elev px-4 py-6 text-center text-sub">
            오늘 예정된 수업이 없습니다.
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-fg">담당 프로그램</h2>
          <Link href={`${DEMO_ROLE_PATH.instructor}/classes`} className="text-sm text-gold underline">
            전체 회차
          </Link>
        </div>
        <div className="mt-3 rounded-[18px] border border-line bg-card p-4">
          <p className="text-[13px] text-sub">{DEMO_INSTRUCTOR_CLASS.contractCode}</p>
          <p className="mt-1 text-[18px] font-bold text-fg">{DEMO_INSTRUCTOR_CLASS.title}</p>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[17px] font-bold text-fg">다음 수업</h2>
          <ul className="mt-3 space-y-2">
            {upcoming.map((s) => (
              <li key={s.id}>
                <Link
                  href={`${DEMO_ROLE_PATH.instructor}/session/${s.id}`}
                  className="tap flex items-center justify-between rounded-xl border border-line bg-elev px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-fg">{s.sessionNumber}회차 · {s.topic}</p>
                    <p className="text-sm text-sub">{s.date}</p>
                  </div>
                  <span className="text-gold">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
