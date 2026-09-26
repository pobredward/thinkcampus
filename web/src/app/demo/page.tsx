"use client";

import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_ROLE_PATH } from "@/lib/demoPortal";

const ROLES = [
  {
    href: DEMO_ROLE_PATH.guardian,
    title: "학부모",
    desc: "자녀 수업·출결·리포트·알림을 확인하는 학부모 앱",
    accent: "border-gold/40 bg-gold/5",
  },
  {
    href: DEMO_ROLE_PATH.instructor,
    title: "강사",
    desc: "담당 회차 수업, 출결 확인, 수업 자료 안내",
    accent: "border-sky-500/30 bg-sky-500/5",
  },
  {
    href: DEMO_ROLE_PATH.center,
    title: "센터 관리자",
    desc: "캠퍼스별 운영 건·회차 출결 입력",
    accent: "border-emerald-500/30 bg-emerald-500/5",
  },
  {
    href: DEMO_ROLE_PATH.company,
    title: "회사 관리자",
    desc: "명단 import, 운영 건 생성, 전사 설정",
    accent: "border-violet-500/30 bg-violet-500/5",
  },
] as const;

export default function DemoHubPage() {
  usePageTitle("체험판");

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5 py-10">
      <header className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">ThinkCampus</p>
        <h1 className="mt-2 text-[28px] font-bold leading-tight text-fg">역할별 체험판</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-sub">
          로그인·등록코드 없이 각 역할의 화면을 둘러볼 수 있습니다.
          <br />
          데이터는 모두 예시이며 저장되지 않습니다.
        </p>
      </header>

      <ul className="flex flex-1 flex-col gap-4">
        {ROLES.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className={`tap block rounded-2xl border p-5 shadow-sm transition hover:border-gold/50 ${r.accent}`}
            >
              <h2 className="text-xl font-bold text-fg">{r.title}</h2>
              <p className="mt-2 text-[15px] leading-snug text-fg2">{r.desc}</p>
              <span className="mt-4 inline-block text-sm font-semibold text-gold">체험 시작 →</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-xs text-faint">
        실제 서비스는{" "}
        <Link href="/onboarding" className="underline">
          등록코드·로그인
        </Link>
        으로 이용합니다.
      </p>
    </div>
  );
}
