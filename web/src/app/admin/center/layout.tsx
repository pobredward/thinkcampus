"use client";

import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

export default function CenterAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRouteGuard mode="staff" loginNext="/admin/center/attendance">{children}</AdminRouteGuard>
  );
}
