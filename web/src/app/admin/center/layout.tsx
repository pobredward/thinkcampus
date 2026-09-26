"use client";

import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { StaffAppShell } from "@/components/admin/StaffAppShell";
import { DemoCenterRunProvider } from "@/providers/CenterRunProvider";

export default function CenterAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRouteGuard mode="staff" loginNext="/admin/center">
      <DemoCenterRunProvider>
        <StaffAppShell variant="center">{children}</StaffAppShell>
      </DemoCenterRunProvider>
    </AdminRouteGuard>
  );
}
