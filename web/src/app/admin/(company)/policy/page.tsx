"use client";

import { usePageTitle } from "@/hooks/usePageTitle";

export default function CompanyPolicyPage() {
  usePageTitle("정책");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-fg">리포트 정책</h2>
        <p className="mt-1 text-sm text-sub">
          회차 리포트 필드·검수 단계·학부모 노출 시점 (Phase C)
        </p>
      </div>

      <div className="space-y-3 rounded-[18px] border border-line bg-card p-5 text-[15px]">
        <p>
          <span className="text-sub">기본 흐름 · </span>
          강사 draft → 센터 검수 → published
        </p>
        <p>
          <span className="text-sub">템플릿 · </span>
          운영 건별 Canva·교수 방안 링크 (강사 앱과 동일 소스)
        </p>
        <p className="text-sm text-faint">체험판에서는 읽기 전용 미리보기입니다.</p>
      </div>
    </div>
  );
}
