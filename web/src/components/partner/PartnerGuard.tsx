"use client";

/**
 * 발주처 담당자 영역 가드 — 로그인 + officers 문서(getPartnerAccess) 확인
 *   로그인 안 됨 → 로그인 안내 · 담당자 계정 아님 → 안내 · 첫 로그인(임시 비밀번호) → 비밀번호 바꾸기 화면
 *   체험 중인데 다른 역할이면 발주처 체험으로 안내
 */

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/staff/ui";
import { Spinner } from "@/components/ui/Spinner";
import { DEMO_HUB_PATH, DEMO_ROLE_LABEL, demoEntryPath } from "@/lib/demoMode";
import { useAuth } from "@/providers/AuthProvider";
import { useDemo } from "@/providers/DemoProvider";
import { useApi, useQuery } from "@/services";

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">{children}</div>;
}

export function PartnerGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const api = useApi();
  const { role: demoRole } = useDemo();
  const { user, loading: authLoading, signOut } = useAuth();
  const wrongDemo = !!demoRole && demoRole !== "officer";
  const { data: access, loading } = useQuery(() => (user && !wrongDemo ? api.partner.getAccess() : null), [api, user?.uid, wrongDemo]);

  const mustChange = !!access?.allowed && access.mustChangePassword;
  useEffect(() => {
    if (mustChange) router.replace(`/partner/login?change=1&next=${encodeURIComponent(pathname)}`);
  }, [mustChange, router, pathname]);

  if (wrongDemo) {
    return (
      <Center>
        <h1 className="text-[24px] font-extrabold text-fg">발주처 담당자 화면이에요</h1>
        <p className="text-[16px] leading-[24px] text-sub">지금은 {DEMO_ROLE_LABEL[demoRole!]} 체험 중이에요. 이 화면은 발주처 담당자 체험에서 볼 수 있어요.</p>
        <a href={demoEntryPath("officer")} className="tap inline-flex min-h-[52px] items-center justify-center rounded-xl bg-gold px-5 text-[17px] font-bold text-ink">
          발주처 담당자 체험으로 바꾸기
        </a>
        <Link href={DEMO_HUB_PATH} className="text-[15px] text-gold underline">
          역할 다시 고르기
        </Link>
      </Center>
    );
  }

  if (authLoading || user === undefined || (user && (loading || !access)) || mustChange) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <Spinner size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Center>
        <h1 className="text-[24px] font-extrabold text-fg">로그인이 필요해요</h1>
        <p className="text-[16px] leading-[24px] text-sub">발주처 담당자는 안내받은 이메일 계정으로 로그인해요.</p>
        <Button href={`/partner/login?next=${encodeURIComponent(pathname)}`} size="lg">
          담당자 로그인
        </Button>
      </Center>
    );
  }

  if (!access?.allowed) {
    return (
      <Center>
        <h1 className="text-[24px] font-extrabold text-fg">발주처 담당자 계정이 아니에요</h1>
        <p className="text-[16px] leading-[24px] text-sub">씽크캠퍼스 통합 관리자에게 담당자 초대를 요청해 주세요.</p>
        <Button variant="secondary" size="lg" onClick={() => void signOut()}>
          다른 계정으로 로그인
        </Button>
      </Center>
    );
  }

  return <>{children}</>;
}
