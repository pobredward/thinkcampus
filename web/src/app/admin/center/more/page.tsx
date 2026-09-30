"use client";

/**
 * 센터 · 더보기 — 학생 명단 · 강사 배정 · 공지 · 민원·문의 · 만족도 조사 · 내 정보
 */

import { PageTitle, RowLink } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterRun } from "@/providers/CenterRunProvider";

export default function CenterMorePage() {
  usePageTitle("더보기");
  const { summary } = useCenterRun();
  const unassigned = summary?.dashboard.sessionsWithoutInstructor ?? 0;
  const unlinked = summary?.dashboard.studentsWithoutGuardian ?? 0;
  const complaints = summary?.dashboard.complaintsOpen ?? 0;
  return (
    <div>
      <PageTitle title="더보기" />
      <ul className="flex flex-col gap-2">
        <li>
          <RowLink href="/admin/center/students" title="학생 명단" desc={unlinked > 0 ? `보호자가 연결되지 않은 학생 ${unlinked}명` : "반별 명단 · 보호자 연결 · 등록코드"} />
        </li>
        <li>
          <RowLink href="/admin/center/instructors" title="강사 배정" desc={unassigned > 0 ? `강사가 정해지지 않은 회차 ${unassigned}개` : "회차별 담당 강사를 정해요"} />
        </li>
        <li>
          <RowLink href="/admin/center/comms" title="공지 보내기" desc="학부모 앱 알림으로 안내를 보내요" />
        </li>
        <li>
          <RowLink href="/admin/center/inquiries" title="민원·문의 기록" desc={complaints > 0 ? `처리하지 않은 민원 ${complaints}건` : "앱 채팅 · 전화 · 현장 접수를 한곳에서"} />
        </li>
        <li>
          <RowLink href="/admin/center/survey" title="만족도 조사 결과" desc="문항별 평균 · 응답률 · 학부모 후기" />
        </li>
        <li>
          <RowLink href="/admin/center/profile" title="내 정보" desc="계정 · 권한 · 로그아웃" />
        </li>
      </ul>
    </div>
  );
}
