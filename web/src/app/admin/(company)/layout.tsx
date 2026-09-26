"use client";

import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

export default function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminRouteGuard mode="company" loginNext="/admin">{children}</AdminRouteGuard>;
}
