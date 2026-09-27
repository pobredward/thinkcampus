"use client";

import { Suspense } from "react";
import { StaffGuard } from "@/components/staff/StaffGuard";
import { StaffShell } from "@/components/staff/StaffShell";

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffGuard variant="instructor">
      <StaffShell variant="instructor">
        <Suspense fallback={null}>{children}</Suspense>
      </StaffShell>
    </StaffGuard>
  );
}
