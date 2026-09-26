"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterSchedule } from "@/hooks/useCenterSchedule";
import { centerStaffBase } from "@/lib/staffAppNav";
import { buildDemoScheduleToday } from "@/lib/demoCenterScale";
import {
  DEMO_INSTRUCTOR_PROFILES,
  getDemoInstructor,
  readDemoAssignments,
  writeDemoAssignment,
} from "@/lib/demoInstructorStaff";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";
import { PrimaryButton } from "@/components/ui/Button";
import { StaffPhoto } from "@/components/students/StudentPhoto";

export default function CenterInstructorDetailPage() {
  const { staffId } = useParams<{ staffId: string }>();
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const isDemo = active && role === "center";
  const base = centerStaffBase(pathname, isDemo);
  const { selectedRun } = useCenterRun();
  const profile = getDemoInstructor(staffId) ?? DEMO_INSTRUCTOR_PROFILES[0];

  usePageTitle(profile.name);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const { days, reload } = useCenterSchedule(selectedRun?.id, today);
  const [assignOpen, setAssignOpen] = useState(false);
  const [localTick, setLocalTick] = useState(0);

  const allSessions = useMemo(() => {
    const source = isDemo ? buildDemoScheduleToday(today) : days;
    const map = isDemo ? readDemoAssignments() : {};
    const flat: Array<{
      id: string;
      label: string;
      instructorId: string | null;
      instructorName?: string;
    }> = [];
    for (const day of source) {
      for (const slot of day.slots) {
        for (const s of slot.sessions) {
          const assigned = isDemo ? (map[s.id] ?? s.instructorId ?? null) : (s.instructorId ?? null);
          const name =
            assigned === profile.staffId
              ? profile.name
              : assigned
                ? DEMO_INSTRUCTOR_PROFILES.find((p) => p.staffId === assigned)?.name ?? "다른 강사"
                : undefined;
          flat.push({
            id: s.id,
            label: `${day.date} ${slot.startTime} · ${s.sectionLabel} · ${s.topic}`,
            instructorId: assigned,
            instructorName: name,
          });
        }
      }
    }
    return flat;
  }, [days, isDemo, today, profile.staffId, localTick]);

  const mine = allSessions.filter((s) => s.instructorId === profile.staffId);
  const unassigned = allSessions.filter((s) => !s.instructorId);

  function toggleAssign(sessionId: string, assign: boolean) {
    if (!isDemo) return;
    writeDemoAssignment(sessionId, assign ? profile.staffId : null);
    setLocalTick((t) => t + 1);
    void reload();
  }

  return (
    <div className="space-y-6">
      <Link href={`${base}/instructors`} className="text-sm text-gold underline">
        ← 강사 목록
      </Link>

      <header className="flex gap-4">
        <StaffPhoto staffId={profile.staffId} name={profile.name} size={80} />
        <div>
          <h2 className="text-[22px] font-bold text-fg">{profile.name}</h2>
          <p className="text-sm text-sub">{profile.email} · {profile.phone}</p>
          <p className="mt-1 text-[13px] text-sub">{profile.campusName}</p>
        </div>
      </header>

      <p className="text-[15px] leading-relaxed text-fg2">{profile.bio}</p>
      <p className="text-[12px] text-faint">
        전체 기획: <code className="text-sub">docs/INSTRUCTOR_ASSIGNMENT_PLAN.md</code>
      </p>

      <section>
        <h3 className="text-[15px] font-bold text-fg">배정된 회차 ({mine.length})</h3>
        {mine.length === 0 ? (
          <p className="mt-2 text-sm text-sub">아직 배정된 회차가 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {mine.map((s) => (
              <li key={s.id} className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-fg">회차 배정</h3>
          <button
            type="button"
            className="text-sm font-semibold text-gold"
            onClick={() => setAssignOpen((o) => !o)}
          >
            {assignOpen ? "닫기" : "배정하기"}
          </button>
        </div>
        {!isDemo && (
          <p className="mt-2 text-sm text-sub">
            운영 환경에서는 Phase C <code className="text-fg">assignInstructorToSession</code> Callable로 저장됩니다.
          </p>
        )}
        {assignOpen && (
          <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {allSessions.map((s) => {
              const mine = s.instructorId === profile.staffId;
              const other = s.instructorId && !mine;
              return (
                <li key={s.id} className="flex items-start gap-2 rounded-xl border border-line bg-elev px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={mine}
                    disabled={!isDemo || Boolean(other)}
                    onChange={(e) => toggleAssign(s.id, e.target.checked)}
                  />
                  <div>
                    <p className="text-fg">{s.label}</p>
                    {other && (
                      <p className="text-[12px] text-amber-800">이미 {s.instructorName} 배정 — 변경은 Phase C</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {isDemo && assignOpen && unassigned.length > 0 && (
          <PrimaryButton type="button" className="mt-3 w-full" onClick={() => setAssignOpen(false)}>
            체험판 배정 반영됨 (sessionStorage)
          </PrimaryButton>
        )}
      </section>
    </div>
  );
}
