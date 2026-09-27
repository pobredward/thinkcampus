"use client";

/**
 * 센터 · 더보기 — 강사 배정 · 공지 · 내 정보
 */

import { PageTitle, RowLink } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";

export default function CenterMorePage() {
  usePageTitle("더보기");
  const { summary } = useCenterRun();
  const unassigned = summary?.dashboard.sessionsWithoutInstructor ?? 0;
  return (
    <div>
      <PageTitle title="더보기" />
      <ul className="flex flex-col gap-2">
        <li>
          <RowLink href="/admin/center/instructors" title="강사 배정" desc={unassigned > 0 ? `강사가 정해지지 않은 회차 ${unassigned}개` : "회차별 담당 강사를 정해요"} />
        </li>
        <li>
          <RowLink href="/admin/center/comms" title="공지 보내기" desc="학부모 앱 알림으로 안내를 보내요" />
        </li>
        <li>
          <RowLink href="/admin/center/profile" title="내 정보" desc="계정 · 권한 · 로그아웃" />
        </li>
      </ul>
    </div>
  );
}
