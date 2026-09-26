"use client";

import { useEffect } from "react";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function LegacyPeopleStudentsRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, active } = useDemoPortal();
  const base = centerStaffBase(pathname, active && role === "center");

  useEffect(() => {
    const qs = searchParams.toString();
    router.replace(`${base}/students${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [base, router, searchParams]);

  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}
