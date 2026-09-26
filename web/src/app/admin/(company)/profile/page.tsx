"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { companyStaffBase } from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

export default function CompanyProfileRedirectPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const base = companyStaffBase(pathname, active && role === "company");

  useEffect(() => {
    router.replace(`${base}/settings`);
  }, [router, base]);

  return null;
}
