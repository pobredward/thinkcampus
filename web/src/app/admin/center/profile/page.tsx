"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/providers/AuthProvider";
import { useStaffAccess } from "@/hooks/useStaffAccess";

export default function CenterProfilePage() {
  usePageTitle("센터 · 내 정보");
  const { user } = useAuth();
  const { access } = useStaffAccess(user?.uid ?? null);

  return (
    <div className="space-y-5">
      <h2 className="text-[20px] font-bold text-fg">내 정보</h2>
      <div className="rounded-[18px] border border-line bg-card p-5 space-y-3 text-[15px]">
        <p><span className="text-sub">이름 · </span>{user?.displayName ?? "—"}</p>
        <p><span className="text-sub">이메일 · </span>{user?.email ?? "—"}</p>
        <p><span className="text-sub">역할 · </span>센터 관리자 (centerAdmin)</p>
        <p><span className="text-sub">캠퍼스 · </span>{access.campusIds.join(", ") || "—"}</p>
      </div>
      <p className="text-sm text-faint text-center">체험판에서는 로그아웃·권한 변경이 비활성화됩니다.</p>
    </div>
  );
}
