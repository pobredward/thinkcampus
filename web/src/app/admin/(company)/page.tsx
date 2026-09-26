"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_COMPANY_HOME_SUMMARY } from "@/lib/demoCenterOps";
import { buildCompanyNavItems, companyStaffBase } from "@/lib/staffAppNav";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname } from "next/navigation";

export default function AdminHomePage() {
  usePageTitle("회사 홈");
  const pathname = usePathname();
  const { role, active } = useDemoPortal();
  const demoCompany = active && role === "company";
  const base = companyStaffBase(pathname, demoCompany);
  const nav = buildCompanyNavItems(base);
  const summary = demoCompany ? DEMO_COMPANY_HOME_SUMMARY : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-bold text-fg">운영 현황</h2>
        <p className="mt-1 text-[15px] text-sub">
          {demoCompany
            ? "체험판 — 명단 검증·운영 건 흐름을 확인할 수 있습니다."
            : "전사 프로그램·명단을 관리합니다."}
        </p>
      </div>

      {summary && (
        <ul className="grid grid-cols-2 gap-2">
          <li className="rounded-xl border border-line bg-elev px-3 py-3">
            <p className="text-[12px] text-sub">운영 건</p>
            <p className="text-[18px] font-bold text-fg">{summary.activeRuns}</p>
          </li>
          <li className="rounded-xl border border-line bg-elev px-3 py-3">
            <p className="text-[12px] text-sub">캠퍼스</p>
            <p className="text-[18px] font-bold text-fg">{summary.campuses}</p>
          </li>
          <li className="col-span-2 rounded-xl border border-line bg-card px-3 py-3">
            <p className="text-[12px] text-sub">최근 import</p>
            <p className="text-[15px] font-medium text-fg">{summary.lastImport}</p>
          </li>
        </ul>
      )}

      <ul className="space-y-3">
        <li>
          <Link href={`${base}/import`} className="tap block rounded-[18px] border border-line bg-card p-5">
            <h3 className="text-[17px] font-bold text-fg">지자체 명단 import</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg2">
              엑셀·표 붙여넣기 → 학생·가구·등록코드·수강 (dryRun 검증)
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-gold">열기 →</span>
          </Link>
        </li>
        <li>
          <Link href={`${base}/runs`} className="tap block rounded-[18px] border border-line bg-card p-5">
            <h3 className="text-[17px] font-bold text-fg">운영 건 관리</h3>
            <p className="mt-2 text-sm leading-relaxed text-fg2">
              contractCode · 캠퍼스 · 회차 일정 — 센터에 부여
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-gold">열기 →</span>
          </Link>
        </li>
      </ul>

      <section>
        <h3 className="text-[15px] font-bold text-fg">메뉴</h3>
        <ul className="mt-2 grid gap-2">
          {nav
            .filter((n) => n.label !== "홈")
            .map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="tap flex justify-between rounded-xl border border-line bg-elev px-4 py-3">
                  <span>{n.label}</span>
                  <span className="text-gold">›</span>
                </Link>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
