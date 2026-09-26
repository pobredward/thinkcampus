"use client";

import Link from "next/link";
import { Spinner } from "@/components/ui/Spinner";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { staffHomePath } from "@/lib/staffAccess";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

type GuardMode = "company" | "staff";

export function AdminRouteGuard({
  children,
  mode = "company",
  loginNext = "/admin",
}: {
  children: React.ReactNode;
  mode?: GuardMode;
  loginNext?: string;
}) {
  const router = useRouter();
  const { role: demoRole, active: demoActive } = useDemoPortal();
  const { user, loading: authLoading } = useAuth();
  const { access, checking } = useStaffAccess(user?.uid ?? null);

  const demoStaffOk =
    demoActive &&
    ((mode === "company" && demoRole === "company") || (mode === "staff" && demoRole === "center"));

  const allowed = demoStaffOk || (mode === "company" ? access.companyAdmin : access.allowed);

  useEffect(() => {
    if (checking || !user) return;
    if (mode === "company" && access.centerAdmin && !access.companyAdmin) {
      const home = staffHomePath(access);
      if (home) router.replace(home);
    }
  }, [checking, user, mode, access, router]);

  if (demoStaffOk) {
    return <>{children}</>;
  }

  if (authLoading || user === undefined || checking) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="large" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(loginNext);
    return (
      <div className="rounded-lg border border-line bg-elev p-6">
        <h2 className="text-lg font-bold text-fg">로그인이 필요합니다</h2>
        <p className="mt-2 text-fg2">관리자·센터 직원은 이메일로 로그인해 주세요.</p>
        <Link href={`/admin/login?next=${next}`} className="mt-4 inline-block text-gold underline">
          관리자 로그인 →
        </Link>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-lg border border-danger/40 bg-elev p-6">
        <h2 className="text-lg font-bold text-fg">접근 권한 없음</h2>
        {mode === "company" ? (
          <p className="mt-2 text-fg2 leading-relaxed">
            회사 관리: <code className="text-fg">companyAdmin</code> 또는{" "}
            <code className="text-fg">ROSTER_IMPORT_UIDS</code>
          </p>
        ) : (
          <p className="mt-2 text-fg2 leading-relaxed">
            센터: <code className="text-fg">centerAdmin</code> + <code className="text-fg">campusIds</code> 또는{" "}
            <code className="text-fg">companyAdmin</code>
          </p>
        )}
        {mode === "company" && access.centerAdmin && (
          <Link href="/admin/center/attendance" className="mt-3 inline-block text-gold underline">
            센터 출결 화면으로 →
          </Link>
        )}
        <pre className="mt-4 overflow-x-auto rounded bg-bg p-3 text-xs text-sub">
          npx ts-node createStaffUser.ts email@example.com &apos;password&apos; company
        </pre>
        <Link href="/admin/login" className="mt-4 mr-4 inline-block text-gold underline">다른 계정으로 로그인</Link>
        <Link href="/main" className="mt-4 inline-block text-gold underline">학부모 앱으로</Link>
      </div>
    );
  }

  return <>{children}</>;
}
