"use client";

/**
 * 회사·센터 관리자 공통 레이아웃 (권한은 하위 segment layout에서 검사)
 * @see docs/DATA_MODEL.md
 */

import { AdminNav } from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-fg">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}
