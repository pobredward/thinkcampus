"use client";

import { useEffect } from "react";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

/** 레거시 `/people` → 학생 탭 */
export default function CenterPeopleLegacyRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, active } = useDemoPortal();
  const demoCenter = active && role === "center";
  const base = centerStaffBase(pathname, demoCenter);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const target =
      tab === "instructors" || pathname.endsWith("/instructors")
        ? `${base}/instructors`
        : `${base}/students`;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("tab");
    const qs = next.toString();
    router.replace(`${target}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [base, pathname, router, searchParams]);

  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}
