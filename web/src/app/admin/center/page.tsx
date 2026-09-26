"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterScreenData } from "@/hooks/useCenterScreenData";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function CenterHomePage() {
  usePageTitle("센터 홈");
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const demoCenter = active && role === "center";
  const base = centerStaffBase(pathname, demoCenter);
  const { selectedRun, runsLoading } = useCenterRun();
  const { ops, loading, error, hasRun } = useCenterScreenData();

  const nextLesson = ops?.lessons.find((l) => l.attendanceRate < 1) ?? ops?.lessons[ops.lessons.length - 1];

  const tasks = ops
    ? [
        { id: "sessions-today", label: "오늘 회차", value: `${ops.dashboard.sessionsToday}건`, hrefSuffix: "/lessons" },
        {
          id: "attendance-pending",
          label: "출결 미입력",
          value: `${ops.dashboard.attendancePendingSessions}회차`,
          hrefSuffix: "/lessons",
          warn: ops.dashboard.attendancePendingSessions > 0,
        },
        {
          id: "reports-review",
          label: "리포트 검수 대기",
          value: `${ops.dashboard.reportsPendingReview}건`,
          hrefSuffix: "/reports",
          warn: ops.dashboard.reportsPendingReview > 0,
        },
        {
          id: "guardian-unlinked",
          label: "학부모 미연결",
          value: `${ops.dashboard.studentsWithoutGuardian}명`,
          hrefSuffix: "/people?tab=guardians",
          warn: ops.dashboard.studentsWithoutGuardian > 0,
        },
        {
          id: "instructor-gap",
          label: "강사 미배정 회차",
          value: `${ops.dashboard.sessionsWithoutInstructor}건`,
          hrefSuffix: "/lessons",
          warn: ops.dashboard.sessionsWithoutInstructor > 0,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-bold text-fg">오늘 할 일</h2>
        <p className="mt-1 text-[15px] text-sub">
          {selectedRun
            ? `${selectedRun.contractCode} · ${selectedRun.municipalityName}`
            : runsLoading
              ? "운영 건 불러오는 중…"
              : "회사에서 부여한 운영 건이 없습니다."}
        </p>
      </div>

      {(loading || runsLoading) && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {hasRun && nextLesson && !loading && (
        <Link
          href={`${base}/attendance?session=${nextLesson.id}`}
          className="tap block rounded-[18px] border border-gold/30 bg-card p-5"
        >
          <p className="text-[13px] font-semibold text-gold">다음 회차</p>
          <p className="mt-1 text-[17px] font-bold text-fg">
            {nextLesson.sessionNumber}회차 · {nextLesson.topic}
          </p>
          <p className="mt-1 text-sm text-sub">{nextLesson.scheduledDate}</p>
          <span className="mt-3 inline-block text-sm font-semibold text-gold">출결 입력 →</span>
        </Link>
      )}

      {tasks.length > 0 && !loading && (
        <section>
          <h3 className="text-[15px] font-bold text-fg">요약</h3>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {tasks.map((t) => (
              <li key={t.id}>
                <Link
                  href={`${base}${t.hrefSuffix}`}
                  className={`tap block rounded-xl border px-3 py-3 ${
                    t.warn ? "border-amber-500/40 bg-amber-500/5" : "border-line bg-elev"
                  }`}
                >
                  <p className="text-[12px] text-sub">{t.label}</p>
                  <p className="mt-0.5 text-[18px] font-bold text-fg">{t.value}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasRun && !runsLoading && (
        <p className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
          운영 건이 배정되면 홈에서 회차·출결·리포트 대기 건을 볼 수 있습니다.
        </p>
      )}
    </div>
  );
}
