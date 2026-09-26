"use client";

import Link from "next/link";
import { AdminHeaderAuth } from "@/components/admin/AdminHeaderAuth";
import { DEMO_HUB_PATH, DEMO_ROLE_PATH } from "@/lib/demoPortal";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

export function AdminNav() {
  const { role, active } = useDemoPortal();

  const companyHref = active && role === "company" ? DEMO_ROLE_PATH.company : "/admin";
  const centerHref = active && role === "center" ? DEMO_ROLE_PATH.center : "/admin/center/attendance";
  const guardianHref = active && role === "guardian" ? DEMO_ROLE_PATH.guardian : "/main";

  return (
    <header className="border-b border-line px-4 py-3">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-semibold">ThinkCampus Admin</span>
        <nav className="flex flex-wrap items-center gap-3 text-sm text-fg2">
          <Link href={companyHref} className="underline">회사</Link>
          <Link href={centerHref} className="underline">센터 출결</Link>
          <Link href={guardianHref} className="underline">학부모 앱</Link>
          <Link href={DEMO_HUB_PATH} className="underline">체험판</Link>
          <AdminHeaderAuth />
        </nav>
      </div>
    </header>
  );
}
