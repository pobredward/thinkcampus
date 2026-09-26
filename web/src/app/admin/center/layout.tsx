"use client";

import { Suspense } from "react";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { StaffAppShell } from "@/components/admin/StaffAppShell";
import { DemoCenterRunProvider } from "@/providers/CenterRunProvider";
import { CenterScopeProvider } from "@/providers/CenterScopeProvider";

export default function CenterAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRouteGuard mode="staff" loginNext="/admin/center">
      <DemoCenterRunProvider>
        <Suspense fallback={null}>
          <CenterScopeProvider>
            <StaffAppShell variant="center">{children}</StaffAppShell>
          </CenterScopeProvider>
        </Suspense>
      </DemoCenterRunProvider>
    </AdminRouteGuard>
  );
}
