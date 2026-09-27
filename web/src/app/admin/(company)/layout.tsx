"use client";

import { Suspense } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffShell } from "@/components/staff/StaffShell";

export default function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard variant="company">
      <StaffShell variant="company" subtitle="씽크캠퍼스 본사">
        <Suspense fallback={null}>{children}</Suspense>
      </StaffShell>
    </StaffGuard>
  );
}
