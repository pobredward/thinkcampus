"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DUMMY_PROGRAM } from "@/data/dummyProgram";
import {
  DEMO_INSTRUCTOR_CLASS,
  DEMO_INSTRUCTOR_ROSTER,
  DEMO_INSTRUCTOR_SESSIONS,
} from "@/lib/demoInstructor";
import { DEMO_ROLE_PATH } from "@/lib/demoPortal";

const ATT_LABEL = {
  present: { text: "출석", className: "text-emerald-400" },
  late: { text: "지각", className: "text-amber-400" },
  absent: { text: "결석", className: "text-danger" },
} as const;

export default function InstructorSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const session = useMemo(
    () => DEMO_INSTRUCTOR_SESSIONS.find((s) => s.id === sessionId) ?? DEMO_INSTRUCTOR_SESSIONS[2],
    [sessionId],
  );
  const detail = DUMMY_PROGRAM.sessions.find((s) => s.id === session.id);

  usePageTitle(`${session.sessionNumber}회차`);

  return (
    <div className="flex flex-1 flex-col pb-8">
      <div className="border-b border-line px-5 py-4" style={{ paddingTop: "calc(var(--sat) + 8px)" }}>
        <Link href={DEMO_ROLE_PATH.instructor} className="text-sm text-gold underline">← 오늘</Link>
        <p className="mt-2 text-[13px] text-sub">{DEMO_INSTRUCTOR_CLASS.contractCode}</p>
        <h1 className="text-[22px] font-bold text-fg">{session.sessionNumber}회차 · {session.topic}</h1>
        <p className="mt-1 text-[15px] text-sub">{session.date} · {session.location}</p>
      </div>

      {detail?.description && (
        <section className="px-5 py-5">
          <h2 className="text-[15px] font-bold text-fg">수업 안내</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-fg2">{detail.description}</p>
        </section>
      )}

      <section className="px-5">
        <h2 className="text-[15px] font-bold text-fg">학생 출결 (센터 입력 반영)</h2>
        <p className="mt-1 text-sm text-sub">강사는 조회만 가능합니다. 변경은 센터 관리자가 합니다.</p>
        <ul className="mt-4 space-y-2">
          {DEMO_INSTRUCTOR_ROSTER.map((st) => {
            const att = ATT_LABEL[st.attendance];
            return (
              <li
                key={st.studentId}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3"
              >
                <span className="font-medium text-fg">{st.name}</span>
                <span className={`text-sm font-semibold ${att.className}`}>
                  {att.text}
                  {st.attendance === "late" && st.lateMinutes ? ` ${st.lateMinutes}분` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {detail?.lessonPlans && detail.lessonPlans.length > 0 && (
        <section className="mt-8 px-5">
          <h2 className="text-[15px] font-bold text-fg">차시별 자료</h2>
          <ul className="mt-3 space-y-2">
            {detail.lessonPlans.map((lp) => (
              <li key={lp.lessonNumber} className="rounded-xl border border-line bg-elev px-4 py-3 text-sm text-fg2">
                {lp.lessonNumber}차시 · {lp.topic}
                {lp.slideUrl && (
                  <span className="ml-2 text-gold">Canva 링크 (체험)</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
