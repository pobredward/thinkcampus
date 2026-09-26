"use client";

import { useEffect } from "react";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function LegacyPeopleInstructorsRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const base = centerStaffBase(pathname, active && role === "center");

  useEffect(() => {
    router.replace(`${base}/instructors`, { scroll: false });
  }, [base, router]);

  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}
