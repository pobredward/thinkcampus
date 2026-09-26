"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_ROLE_PATH } from "@/lib/demoPortal";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

const CARDS = [
  {
    href: "/admin/import",
    demoHref: `${DEMO_ROLE_PATH.company}/import`,
    title: "지자체 명단 import",
    desc: "엑셀·표 붙여넣기 → 학생·가구·등록코드·수강 생성 (dryRun 검증)",
  },
  {
    href: "/admin/runs/new",
    demoHref: `${DEMO_ROLE_PATH.company}/runs/new`,
    title: "운영 건 생성",
    desc: "contractCode · 캠퍼스 · 기간 · 회차 일정 자동 생성",
  },
  {
    href: "/admin/center/attendance",
    demoHref: DEMO_ROLE_PATH.center,
    title: "센터 출결",
    desc: "캠퍼스 담당자용 회차별 출결 입력 (학부모 앱 연동)",
  },
];

export default function AdminHomePage() {
  usePageTitle("회사 Admin");
  const { active, role } = useDemoPortal();
  const companyDemo = active && role === "company";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-fg">회사 관리자</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-fg2">
          {companyDemo
            ? "체험판 — 화면 흐름과 검증(dryRun)만 확인할 수 있습니다."
            : "이메일 로그인 + companyAdmin claim 으로 보호됩니다."}
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-1">
        {CARDS.map((c) => {
          const href = companyDemo ? c.demoHref : c.href;
          return (
            <li key={c.title}>
              <Link
                href={href}
                className="tap block rounded-2xl border border-line bg-card p-5 transition hover:border-gold/40"
              >
                <h2 className="text-lg font-bold text-fg">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-fg2">{c.desc}</p>
                <span className="mt-3 inline-block text-sm font-semibold text-gold">열기 →</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="rounded-xl border border-line bg-elev p-4 text-sm text-fg2 leading-relaxed">
        <h2 className="font-semibold text-fg">데이터 모델 요약</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <code className="text-fg">contractCode</code> — 운영 건 대외 코드, 전역 중복 불가
          </li>
          <li>
            <code className="text-fg">householdId</code> — 명단 import 시 형제 묶음
          </li>
          <li>
            <code className="text-fg">guardianLinks</code> — 학부모 앱 &quot;내 자녀&quot; 연결
          </li>
        </ul>
        {!companyDemo && (
          <p className="mt-3">
            문서: <code className="text-fg">docs/DATA_MODEL.md</code>
          </p>
        )}
      </section>
    </div>
  );
}
