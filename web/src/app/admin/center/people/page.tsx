"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterScreenData } from "@/hooks/useCenterScreenData";
import { centerStaffBase } from "@/lib/staffAppNav";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { usePathname, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

type PeopleTab = "students" | "guardians" | "instructors";

const TABS: { id: PeopleTab; label: string }[] = [
  { id: "students", label: "수강생" },
  { id: "guardians", label: "학부모" },
  { id: "instructors", label: "강사" },
];

export default function CenterPeoplePage() {
  usePageTitle("사람");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, active } = useDemoPortal();
  const demoCenter = active && role === "center";
  const base = centerStaffBase(pathname, demoCenter);
  const { selectedRun } = useCenterRun();
  const { ops, loading, error, hasRun } = useCenterScreenData();

  const tab = (searchParams.get("tab") as PeopleTab) || "students";
  const activeTab = TABS.some((t) => t.id === tab) ? tab : "students";

  const students = ops?.students ?? [];
  const guardians = ops?.guardians ?? [];
  const instructors = ops?.instructors ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-fg">사람</h2>
        <p className="mt-1 text-sm text-sub">
          {selectedRun ? `${selectedRun.contractCode} 수강·연결·강사` : "운영 건을 선택하세요."}
        </p>
      </div>

      <div className="flex gap-1 rounded-xl border border-line bg-elev p-1">
        {TABS.map((t) => {
          const on = activeTab === t.id;
          return (
            <Link
              key={t.id}
              href={`${base}/people?tab=${t.id}`}
              className={`tap flex-1 rounded-lg py-2 text-center text-[13px] font-semibold ${
                on ? "bg-card text-gold shadow-sm" : "text-sub"
              }`}
              aria-current={on ? "page" : undefined}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !hasRun && (
        <p className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
          데이터가 없습니다.
        </p>
      )}

      {!loading && hasRun && activeTab === "students" && (
        <ul className="space-y-2">
          {students.length === 0 ? (
            <li className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
              수강생이 없습니다. 회사에서 명단 import 후 확인하세요.
            </li>
          ) : (
            students.map((s) => (
              <li
                key={s.studentId}
                className="flex items-center justify-between rounded-xl border border-line bg-card px-4 py-3"
              >
                <div>
                  <p className="font-medium text-fg">{s.name}</p>
                  {s.householdId && <p className="text-[12px] text-sub">가구 {s.householdId}</p>}
                </div>
                <span className="text-[12px] text-sub">등록코드 {s.enrollmentCodeStatus}</span>
              </li>
            ))
          )}
        </ul>
      )}

      {!loading && hasRun && activeTab === "guardians" && (
        <ul className="space-y-3">
          {guardians.map((row) => (
            <li key={row.studentId} className="rounded-xl border border-line bg-card p-4">
              <p className="font-semibold text-fg">{row.studentName}</p>
              {row.guardians.length === 0 ? (
                <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-900">
                  {row.unlinkedNote ?? "연결된 보호자 없음"}
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-sub">
                  {row.guardians.map((g, i) => (
                    <li key={i}>
                      {g.name} · {g.relation}
                      {g.linkedAt ? ` · 연결 ${g.linkedAt}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && hasRun && activeTab === "instructors" && (
        <ul className="space-y-2">
          {instructors.length === 0 ? (
            <li className="rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
              회차에 배정된 강사가 없습니다.
            </li>
          ) : (
            instructors.map((ins) => (
              <li key={ins.staffId} className="rounded-xl border border-line bg-card px-4 py-3">
                <p className="font-medium text-fg">{ins.name}</p>
                {ins.email && <p className="text-sm text-sub">{ins.email}</p>}
                <p className="mt-1 text-[12px] text-sub">이번 주 회차 {ins.sessionsThisWeek}건</p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
