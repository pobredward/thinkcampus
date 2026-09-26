"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_CENTER_RUNS } from "@/lib/demoPortal";
import { companyStaffBase } from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";

export default function CompanyRunsPage() {
  usePageTitle("운영 건");
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const base = companyStaffBase(pathname, active && role === "company");

  const runs = active && role === "company" ? DEMO_CENTER_RUNS : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold text-fg">운영 건</h2>
        <Link href={`${base}/runs/new`} className="text-sm font-semibold text-gold underline">
          + 새 운영 건
        </Link>
      </div>
      <p className="text-sm text-sub">
        contractCode는 회사에서 지정합니다. 센터에는 부여된 건만 노출됩니다.
      </p>
      <ul className="space-y-2">
        {runs.map((r) => (
          <li key={r.id} className="rounded-xl border border-line bg-card px-4 py-4">
            <p className="font-bold text-fg">{r.contractCode}</p>
            <p className="text-sm text-sub">{r.municipalityName} · {r.campusName ?? r.campusId}</p>
          </li>
        ))}
      </ul>
      {runs.length === 0 && (
        <p className="text-center text-sub py-8">등록된 운영 건이 없습니다.</p>
      )}
    </div>
  );
}
