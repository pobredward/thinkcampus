"use client";

import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { StaffAppShell } from "@/components/admin/StaffAppShell";

export default function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRouteGuard mode="company" loginNext="/admin">
      <StaffAppShell variant="company">{children}</StaffAppShell>
    </AdminRouteGuard>
  );
}
