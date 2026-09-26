"use client";

/**
 * Admin 루트 — 로그인 등. 센터·회사 앱 UI는 각 segment layout(StaffAppShell)에서 처리.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminHeaderAuth } from "@/components/admin/AdminHeaderAuth";
import { DEMO_HUB_PATH } from "@/lib/demoPortal";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const isStaffApp =
    pathname.startsWith("/admin/center") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/import") ||
    pathname.startsWith("/admin/runs");

  if (isStaffApp && !isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      {!isLogin && (
        <header className="border-b border-line px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span className="text-lg font-semibold">ThinkCampus</span>
            <nav className="flex items-center gap-3 text-sm text-fg2">
              <Link href={DEMO_HUB_PATH} className="underline">체험판</Link>
              <AdminHeaderAuth />
            </nav>
          </div>
        </header>
      )}
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
