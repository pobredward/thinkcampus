"use client";

/**
 * 직원 영역 가드 — 로그인 + 권한(회사 · 센터 · 강사) 확인
 * 체험 중이면 역할이 맞는지 본다 (학부모 체험으로 /admin 에 오면 센터 체험으로 안내).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/staff/ui";
import { Spinner } from "@/components/ui/Spinner";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { DEMO_HUB_PATH, DEMO_ROLE_LABEL, demoEntryPath, demoRoleForPath } from "@/lib/demoMode";
import { canOpenStaffPath, staffHomePath } from "@/lib/staffAccess";
import type { StaffVariant } from "@/lib/staffAppNav";
import { useAuth } from "@/providers/AuthProvider";
import { useDemo } from "@/providers/DemoProvider";

const VARIANT_LABEL: Record<StaffVariant, string> = { center: "프로그램 매니저", company: "통합 관리자", instructor: "강사" };

export function StaffGuard({ variant, children }: { variant: StaffVariant; children: React.ReactNode }) {
  const pathname = usePathname();
  const { role: demoRole } = useDemo();
  const { user, loading: authLoading } = useAuth();
  const { access, checking } = useStaffAccess(user?.uid ?? null);

  if (authLoading || user === undefined || (user && checking)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <Spinner size="large" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(pathname);
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-[24px] font-extrabold text-fg">로그인이 필요해요</h1>
        <p className="text-[16px] leading-[24px] text-sub">회사·센터 직원과 강사는 이메일 계정으로 로그인해요.</p>
        <Button href={`/admin/login?next=${next}`} size="lg">
          직원 로그인
        </Button>
        <p className="text-[14px] text-faint">
          체험판을 보려면{" "}
          <Link href={DEMO_HUB_PATH} className="text-gold underline">
            역할별 체험판
          </Link>
          으로 가세요.
        </p>
      </div>
    );
  }

  if (!canOpenStaffPath(access, pathname)) {
    const wanted = demoRoleForPath(pathname);
    const home = staffHomePath(access);
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-[24px] font-extrabold text-fg">{VARIANT_LABEL[variant]} 화면이에요</h1>
        {demoRole ? (
          <>
            <p className="text-[16px] leading-[24px] text-sub">
              지금은 {DEMO_ROLE_LABEL[demoRole]} 체험 중이에요. 이 화면은 {wanted ? DEMO_ROLE_LABEL[wanted] : VARIANT_LABEL[variant]} 체험에서 볼 수 있어요.
            </p>
            {wanted && (
              <a href={demoEntryPath(wanted)} className="tap inline-flex min-h-[52px] items-center justify-center rounded-xl bg-gold px-5 text-[17px] font-bold text-ink">
                {DEMO_ROLE_LABEL[wanted]} 체험으로 바꾸기
              </a>
            )}
            <Link href={DEMO_HUB_PATH} className="text-[15px] text-gold underline">
              역할 다시 고르기
            </Link>
          </>
        ) : (
          <>
            <p className="text-[16px] leading-[24px] text-sub">이 계정에는 {VARIANT_LABEL[variant]} 권한이 없어요. 통합 관리자에게 권한을 요청해 주세요.</p>
            {home && (
              <Button href={home} size="lg">
                내 화면으로
              </Button>
            )}
            <Link href="/admin/login" className="text-[15px] text-gold underline">
              다른 계정으로 로그인
            </Link>
          </>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
