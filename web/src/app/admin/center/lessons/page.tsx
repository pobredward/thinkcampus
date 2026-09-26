"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterScreenData } from "@/hooks/useCenterScreenData";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

function attendanceLabel(rate: number) {
  if (rate >= 1) return "출결 완료";
  if (rate > 0) return `입력 ${Math.round(rate * 100)}%`;
  return "미입력";
}

export default function CenterLessonsPage() {
  usePageTitle("수업");
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const demoCenter = active && role === "center";
  const base = centerStaffBase(pathname, demoCenter);
  const { selectedRun } = useCenterRun();
  const { ops, loading, error, hasRun } = useCenterScreenData();

  const lessons = ops?.lessons ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-fg">수업 · 회차</h2>
        <p className="mt-1 text-sm text-sub">
          {selectedRun ? `${selectedRun.contractCode} 일정` : "운영 건을 선택하세요."}
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && hasRun && lessons.length === 0 && (
        <p className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
          표시할 회차가 없습니다.
        </p>
      )}

      {!loading && lessons.length > 0 && (
        <ul className="space-y-3">
          {lessons.map((s) => (
            <li key={s.id}>
              <Link
                href={`${base}/attendance?session=${s.id}`}
                className="tap block rounded-[18px] border border-line bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-semibold text-gold">{s.sessionNumber}회차</p>
                    <p className="mt-0.5 text-[17px] font-bold text-fg">{s.topic}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${
                      s.attendanceRate >= 1
                        ? "bg-emerald-500/10 text-emerald-700"
                        : s.attendanceRate > 0
                          ? "bg-amber-500/10 text-amber-800"
                          : "bg-line text-sub"
                    }`}
                  >
                    {attendanceLabel(s.attendanceRate)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-sub">
                  {s.scheduledDate} · {s.startTime}–{s.endTime}
                </p>
                <p className="text-sm text-sub">
                  {s.location}
                  {s.instructorName ? ` · ${s.instructorName}` : ""}
                </p>
                <span className="mt-2 inline-block text-sm font-semibold text-gold">출결 시트 →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
