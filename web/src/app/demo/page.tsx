"use client";

/**
 * 체험판 허브 — 세 묶음(내부 운영 · 발주처 · 학부모)에서 역할을 고르면 쿠키를 심고 그 역할의 실제 화면으로 간다
 *   /demo/<role> → /admin · /admin/center · /instructor · /partner · /main
 * Firebase 없이 뜬다.
 */

import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_ROLE_LABEL, DEMO_SECTORS, demoEntryPath, type DemoRole } from "@/lib/demoMode";

const ROLE_DESC: Record<DemoRole, string> = {
  company: "모든 캠퍼스의 운영 건 · 명단 등록 · 발주처 담당자 계정 · 리포트 정책",
  center: "캠퍼스 운영 — 시간표 · 출결 · 학부모 채팅 · 민원 처리 · 리포트 검수 · 공지",
  instructor: "오늘 수업 확인 · 출결 입력 · 회차 리포트 작성 · 제출",
  officer: "진행 현황 · 민원 접수·처리 · 주차별 출석 · 강사진 · 만족도 · 보고서 내려받기",
  guardian: "자녀의 수업 일정 · 출결 · 선생님 피드백 · 담당 선생님과 채팅 · 만족도 조사",
};

const ROLE_ACCOUNT: Record<DemoRole, string> = {
  company: "김도현 · 씽크캠퍼스 본사",
  center: "이정민 · 달성캠퍼스",
  instructor: "박지훈 강사 · 달성캠퍼스 1반·4반 담당",
  officer: "한지원 주무관 · 달성군청 교육지원과",
  guardian: "신선웅 학부모 · 자녀 신민준(1반) · 신서연(4반)",
};

export default function DemoHubPage() {
  usePageTitle("체험판");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-10">
      <header className="mb-8">
        <p className="text-[14px] font-bold tracking-widest text-gold">THINKCAMPUS</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-[36px] text-fg">역할별 체험판</h1>
        <p className="mt-3 text-[16px] leading-[24px] text-sub">
          로그인·등록코드 없이 각 역할의 화면을 그대로 써 볼 수 있어요. 모든 역할이 같은 예시 데이터를 보고, 저장한 내용은 이 브라우저 탭을 닫을 때까지 유지돼요.
        </p>
        <p className="mt-3 rounded-[12px] border border-gold-dim bg-gold-light px-4 py-3 text-[15px] leading-[22px] text-fg2">
          시연 순서 — <b className="text-gold">내부 운영</b>에서 수업·출결·민원을 처리하고, <b className="text-gold">발주처</b> 화면에서 그 결과와 보고서를 확인한 뒤, <b className="text-gold">학부모</b> 앱에서 같은 내용을 받아 보세요.
        </p>
      </header>

      <div className="flex flex-col gap-8">
        {DEMO_SECTORS.map((sector, i) => (
          <section key={sector.id} aria-labelledby={`sector-${sector.id}`} data-testid={`demo-sector-${sector.id}`}>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold-dim text-[14px] font-bold text-gold">{i + 1}</span>
              <div className="min-w-0">
                <h2 id={`sector-${sector.id}`} className="text-[20px] font-extrabold text-fg">
                  {sector.title}
                </h2>
                <p className="text-[15px] text-sub">{sector.desc}</p>
              </div>
            </div>
            <ul className="flex flex-col gap-3">
              {sector.roles.map((role) => (
                <li key={role}>
                  <a
                    href={demoEntryPath(role)}
                    className="tap flex h-full flex-col rounded-[18px] border border-line bg-card p-5 transition hover:border-gold-dim"
                    data-testid={`demo-enter-${role}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[19px] font-bold text-fg">{DEMO_ROLE_LABEL[role]}</h3>
                      <span className="shrink-0 text-[15px] font-semibold text-gold">체험 ›</span>
                    </div>
                    <p className="mt-2 flex-1 text-[15px] leading-[22px] text-fg2">{ROLE_DESC[role]}</p>
                    <p className="mt-3 text-[14px] text-sub">{ROLE_ACCOUNT[role]}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-10 text-center text-[14px] text-faint">
        실제 서비스는{" "}
        <a href="/onboarding" className="underline">
          학부모 등록코드·로그인
        </a>
        {" · "}
        <a href="/admin/login" className="underline">
          직원 로그인
        </a>
        {" · "}
        <a href="/partner/login" className="underline">
          발주처 담당자 로그인
        </a>
        으로 이용해요.
      </p>
    </div>
  );
}
