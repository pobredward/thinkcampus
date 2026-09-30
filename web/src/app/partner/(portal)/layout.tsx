"use client";

import { Suspense } from "react";
import { PartnerGuard } from "@/components/partner/PartnerGuard";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { PartnerRunProvider } from "@/providers/PartnerRunProvider";

/** /partner — 발주처 담당자 포털 (로그인 화면 /partner/login 은 이 틀 밖) */
export default function PartnerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PartnerGuard>
      <PartnerRunProvider>
        <PartnerShell>
          <Suspense fallback={null}>{children}</Suspense>
        </PartnerShell>
      </PartnerRunProvider>
    </PartnerGuard>
  );
}
