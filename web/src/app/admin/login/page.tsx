"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PrimaryButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errMessage } from "@/lib/errors";
import { signInWithStaffEmail } from "@/lib/firebase";
import { resolveStaffDestination, staffHomePath } from "@/lib/staffAccess";
import { DEMO_HUB_PATH } from "@/lib/demoMode";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useAuth } from "@/providers/AuthProvider";
import { useApi } from "@/services";
import { DemoRedirect } from "@/components/demo/DemoRedirect";

export default function AdminLoginPage() {
  return (
    <DemoRedirect>
      <StaffLoginForm />
    </DemoRedirect>
  );
}

function StaffLoginForm() {
  usePageTitle("직원 로그인");
  const router = useRouter();
  const api = useApi();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const { user, signOut } = useAuth();
  const { access, checking } = useStaffAccess(user?.uid ?? null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (checking || !user || !access.allowed) return;
    const dest = resolveStaffDestination(access, nextParam) ?? staffHomePath(access);
    if (dest) router.replace(dest);
  }, [user, access, checking, nextParam, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithStaffEmail(trimmedEmail, password);
      const access = await api.staff.checkAccess();
      const dest = resolveStaffDestination(access, nextParam);
      if (!dest) {
        await signOut();
        setError("직원 권한이 없는 계정이에요. 통합 관리자에게 권한을 요청해 주세요.");
        return;
      }
      router.replace(dest);
    } catch (err) {
      setError(errMessage(err, "로그인에 실패했습니다. 이메일·비밀번호를 확인해 주세요."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <h1 className="text-[26px] font-extrabold text-fg">직원 로그인</h1>
        <p className="mt-2 text-[16px] leading-[24px] text-sub">
          회사·센터 직원과 강사는 이메일 계정으로 로그인해요. 학부모는{" "}
          <Link href="/onboarding/login" className="text-gold underline">
            전화번호 로그인
          </Link>
          을 써 주세요.
        </p>
      </div>

      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label htmlFor="admin-email" className="mb-2 block text-[15px] font-semibold text-fg2">이메일</label>
          <TextField
            id="admin-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-2 block text-[15px] font-semibold text-fg2">비밀번호</label>
          <TextField
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-[15px] text-danger">{error}</p>}
        <PrimaryButton type="submit" loading={loading} className="w-full">
          로그인
        </PrimaryButton>
      </form>

      <p className="text-[14px] text-faint">
        계정이 없다면{" "}
        <Link href={DEMO_HUB_PATH} className="text-gold underline">
          역할별 체험판
        </Link>
        으로 화면을 먼저 둘러볼 수 있어요.
      </p>
    </div>
  );
}
