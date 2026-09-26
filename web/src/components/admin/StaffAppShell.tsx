"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { StaffBottomNav } from "@/components/admin/StaffBottomNav";
import { AdminHeaderAuth } from "@/components/admin/AdminHeaderAuth";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { DEMO_HUB_PATH } from "@/lib/demoPortal";
import {
  buildCenterNavItems,
  buildCompanyNavItems,
  centerStaffBase,
  companyStaffBase,
} from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

export function StaffAppShell({
  variant,
  children,
}: {
  variant: "center" | "company";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const demoCenter = active && role === "center";
  const demoCompany = active && role === "company";
  const { runs, selectedRunId, setSelectedRunId, selectedRun } = useCenterRun();

  const base =
    variant === "center" ? centerStaffBase(pathname, demoCenter) : companyStaffBase(pathname, demoCompany);
  const navItems = variant === "center" ? buildCenterNavItems(base) : buildCompanyNavItems(base);

  const title = variant === "center" ? "센터 관리" : "회사 관리";
  const subtitle =
    variant === "center"
      ? selectedRun?.campusName ?? "캠퍼스"
      : "씽크캠퍼스 운영";

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-fg">
      <header
        className="border-b border-line bg-paper px-4 pb-3 pt-[calc(var(--sat)+8px)]"
      >
        <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-gold">{title}</p>
            <h1 className="truncate text-[20px] font-bold leading-tight">{subtitle}</h1>
            {variant === "center" && selectedRun && (
              <p className="mt-0.5 truncate text-[13px] text-sub">
                {selectedRun.municipalityName} · {selectedRun.campusId}
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {variant === "center" && runs.length > 1 && (
              <label className="flex items-center gap-1.5 text-[12px] text-sub">
                <span className="sr-only">운영 건</span>
                <select
                  className="max-w-[9.5rem] truncate rounded-lg border border-line bg-elev px-2 py-1 text-[12px] font-semibold text-fg"
                  value={selectedRunId}
                  onChange={(e) => setSelectedRunId(e.target.value)}
                >
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>{r.contractCode}</option>
                  ))}
                </select>
              </label>
            )}
            {variant === "center" && runs.length === 1 && selectedRun && (
              <span className="rounded-lg border border-line bg-elev px-2 py-1 text-[12px] font-semibold text-fg">
                {selectedRun.contractCode}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Link
                href={`${base}/${variant === "center" ? "profile" : "settings"}`}
                className="rounded-lg border border-line bg-elev px-2 py-1 text-[11px] font-semibold text-sub"
              >
                내 정보
              </Link>
              <AdminHeaderAuth />
            </div>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-lg text-[11px] text-faint">
          <Link href={DEMO_HUB_PATH} className="underline">체험판 홈</Link>
          {variant === "company" && (
            <>
              {" · "}
              <span>센터에 부여한 운영 건만 센터 화면에 표시됩니다</span>
            </>
          )}
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-5">{children}</main>

      <StaffBottomNav items={navItems} />
    </div>
  );
}
