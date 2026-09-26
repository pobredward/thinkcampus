"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/providers/AuthProvider";

export default function CompanySettingsPage() {
  usePageTitle("설정");
  const { user } = useAuth();

  return (
    <div className="space-y-5">
      <h2 className="text-[20px] font-bold text-fg">설정</h2>
      <section>
        <h3 className="text-[15px] font-bold text-fg">내 계정</h3>
        <div className="mt-2 rounded-[18px] border border-line bg-card p-5 space-y-3 text-[15px]">
          <p><span className="text-sub">이름 · </span>{user?.displayName ?? "—"}</p>
          <p><span className="text-sub">이메일 · </span>{user?.email ?? "—"}</p>
          <p><span className="text-sub">역할 · </span>회사 관리자 (companyAdmin)</p>
        </div>
      </section>
      <section>
        <h3 className="text-[15px] font-bold text-fg">스태프·캠퍼스</h3>
        <p className="mt-2 rounded-xl border border-line bg-elev px-4 py-6 text-center text-sm text-sub">
          권한·캠퍼스 카탈로그 관리는 Phase D 예정
        </p>
      </section>
    </div>
  );
}
