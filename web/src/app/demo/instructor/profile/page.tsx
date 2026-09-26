"use client";

import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_INSTRUCTOR_CLASS } from "@/lib/demoInstructor";
import { useAuth } from "@/providers/AuthProvider";

export default function InstructorProfilePage() {
  usePageTitle("강사 · 내 정보");
  const { user } = useAuth();

  return (
    <div className="flex flex-1 flex-col px-5 pb-8" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
      <h1 className="text-[24px] font-bold text-fg">내 정보</h1>
      <div className="mt-6 rounded-[20px] border border-line bg-card p-5 space-y-4">
        <div>
          <p className="text-sm text-sub">이름</p>
          <p className="text-[18px] font-semibold text-fg">{user?.displayName ?? "박강사"}</p>
        </div>
        <div>
          <p className="text-sm text-sub">이메일</p>
          <p className="text-[16px] text-fg">{user?.email ?? "teacher@demo.thinkcampus.kr"}</p>
        </div>
        <div>
          <p className="text-sm text-sub">담당 캠퍼스</p>
          <p className="text-[16px] text-fg">{DEMO_INSTRUCTOR_CLASS.campusName}</p>
        </div>
        <div>
          <p className="text-sm text-sub">역할</p>
          <p className="text-[16px] text-fg">강사 (instructor)</p>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-faint leading-relaxed">
        체험판에서는 계정 설정·로그아웃이 비활성화됩니다.
      </p>
    </div>
  );
}
