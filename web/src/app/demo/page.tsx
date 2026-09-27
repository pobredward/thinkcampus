"use client";

/**
 * 체험판 허브 — 역할을 고르면 쿠키를 심고 그 역할의 실제 화면으로 간다 (/demo/<role> → /main · /instructor · /admin/center · /admin)
 * Firebase 없이 뜬다.
 */

import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_ROLES, DEMO_ROLE_LABEL, demoEntryPath, type DemoRole } from "@/lib/demoMode";

const ROLE_DESC: Record<DemoRole, string> = {
  guardian: "자녀의 수업 일정·출결·선생님 피드백·알림을 봅니다",
  instructor: "오늘 수업 확인, 출결 입력, 회차 리포트 작성·제출",
  center: "캠퍼스 운영 — 시간표·출결·학생·강사 배정·리포트 검수·공지",
  company: "명단 등록, 운영 건 만들기, 리포트 정책, 직원·캠퍼스",
};

const ROLE_ACCOUNT: Record<DemoRole, string> = {
  guardian: "신선웅 학부모 · 자녀 신민준(1반) · 신서연(4반)",
  instructor: "박지훈 강사 · 달성캠퍼스 1반·4반 담당",
  center: "이정민 · 달성캠퍼스 관리자",
  company: "김도현 · 씽크캠퍼스 본사",
};

export default function DemoHubPage() {
  usePageTitle("체험판");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-10">
      <header className="mb-8">
        <p className="text-[14px] font-bold tracking-widest text-gold">THINKCAMPUS</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-[36px] text-fg">역할별 체험판</h1>
        <p className="mt-3 text-[16px] leading-[24px] text-sub">
          로그인·등록코드 없이 각 역할의 화면을 그대로 써 볼 수 있어요. 네 역할이 같은 예시 데이터를 보고, 저장한 내용은 이 브라우저 탭을 닫을 때까지 유지돼요.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {DEMO_ROLES.map((role) => (
          <li key={role}>
            <a
              href={demoEntryPath(role)}
              className="tap block rounded-[18px] border border-line bg-card p-5 transition hover:border-gold-dim"
              data-testid={`demo-enter-${role}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[20px] font-bold text-fg">{DEMO_ROLE_LABEL[role]}</h2>
                <span className="text-[15px] font-semibold text-gold">체험 시작 ›</span>
              </div>
              <p className="mt-2 text-[15px] leading-[22px] text-fg2">{ROLE_DESC[role]}</p>
              <p className="mt-2 text-[14px] text-sub">{ROLE_ACCOUNT[role]}</p>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-center text-[14px] text-faint">
        실제 서비스는{" "}
        <a href="/onboarding" className="underline">
          등록코드·로그인
        </a>
        으로 이용해요.
      </p>
    </div>
  );
}
