"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_HUB_PATH, DEMO_ROLE_PATH, demoRoleFromPath } from "@/lib/demoPortal";

const ROLE_LABEL: Record<string, string> = {
  guardian: "학부모 체험",
  instructor: "강사 체험",
  center: "센터 관리자 체험",
  company: "회사 관리자 체험",
};

export function DemoPortalBanner() {
  const pathname = usePathname();
  const role = demoRoleFromPath(pathname);
  if (!role) return null;

  return (
    <div className="no-print border-b border-gold/30 bg-gold/10 px-4 py-2 text-center text-sm text-fg">
      <span className="font-semibold text-gold">{ROLE_LABEL[role]}</span>
      <span className="text-sub"> — 실제 데이터에 연결되지 않습니다.</span>
      <Link href={DEMO_HUB_PATH} className="ml-2 font-medium text-gold underline">
        역할 다시 선택
      </Link>
      {role !== "guardian" && (
        <Link href={DEMO_ROLE_PATH.guardian} className="ml-3 text-fg2 underline">
          학부모 화면 보기
        </Link>
      )}
    </div>
  );
}
