"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterSummary } from "@/hooks/useCenterSummary";
import { centerStaffBase } from "@/lib/staffAppNav";
import { CenterInstructorList } from "@/components/admin/center/CenterInstructorList";
import { DEMO_INSTRUCTOR_PROFILES } from "@/lib/demoInstructorStaff";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function CenterInstructorsListPage() {
  usePageTitle("강사");
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const demoCenter = active && role === "center";
  const base = centerStaffBase(pathname, demoCenter);
  const { selectedRun } = useCenterRun();
  const { data: summary, loading } = useCenterSummary(selectedRun?.id);

  const unassignedCount = summary?.dashboard.sessionsWithoutInstructor ?? 0;

  return (
    <div className="space-y-3.5">
      {/* 상단 타이틀 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[19px] font-bold text-fg">강사 관리</h2>
          <p className="text-[12px] text-sub">강사 프로필 조회 및 수업 회차 배정</p>
        </div>
        <span className="text-[12px] font-medium text-sub">
          등록 강사 <strong className="text-fg">{DEMO_INSTRUCTOR_PROFILES.length}</strong>명
        </span>
      </div>

      {/* 미배정 회차 경고 블록 (있을 경우) */}
      {unassignedCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-[13px]">
          <div className="flex items-center gap-2">
            <span className="text-amber-800">⚠️</span>
            <span className="font-medium text-amber-900">
              강사 미배정 회차가 <strong>{unassignedCount}건</strong> 있습니다.
            </span>
          </div>
          <Link
            href={`${base}/lessons`}
            className="tap rounded-md bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-900"
          >
            배정하기 ›
          </Link>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}

      {demoCenter ? (
        <CenterInstructorList
          instructors={DEMO_INSTRUCTOR_PROFILES}
          basePath={base}
          sessionsThisWeek={{
            "demo-instructor": 4,
            "demo-instructor-2": 3,
            "demo-instructor-3": 2,
          }}
        />
      ) : (
        <p className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
          로그인 센터에서 강사 목록 API(listCenterInstructors) 연동 예정
        </p>
      )}
    </div>
  );
}
