"use client";

import { Suspense } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffShell } from "@/components/staff/StaffShell";
import { CenterRunProvider } from "@/providers/CenterRunProvider";

export default function CenterAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard variant="center">
      <CenterRunProvider>
        <StaffShell variant="center">
          <Suspense fallback={null}>{children}</Suspense>
        </StaffShell>
      </CenterRunProvider>
    </StaffGuard>
  );
}
