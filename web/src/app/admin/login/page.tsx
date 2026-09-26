"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { usePageTitle } from "@/hooks/usePageTitle";
import { errMessage } from "@/lib/errors";
import { getFns, signInWithStaffEmail } from "@/lib/firebase";
import { resolveStaffDestination, staffHomePath, type StaffAccess } from "@/lib/staffAccess";
import { DEMO_MODE } from "@/lib/demo";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { useAuth } from "@/providers/AuthProvider";

export default function AdminLoginPage() {
  usePageTitle("관리자 로그인");
  const router = useRouter();
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
    if (DEMO_MODE) {
      setError("체험 모드에서는 관리자 로그인을 사용할 수 없습니다.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithStaffEmail(trimmedEmail, password);
      const fn = httpsCallable<Record<string, never>, StaffAccess>(getFns(), "checkStaffAccess");
      const res = await fn({});
      const access = res.data;
      const dest = resolveStaffDestination(access, nextParam);
      if (!dest) {
        await signOut();
        setError("관리자 권한이 없는 계정입니다. (companyAdmin / centerAdmin)");
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
    <div className="mx-auto max-w-md space-y-6 py-8">
      <h1 className="text-2xl font-bold text-fg">관리자 로그인</h1>
      <p className="text-sm text-fg2 leading-relaxed">
        회사·센터 직원 계정(이메일)으로 로그인합니다. 학부모는{" "}
        <Link href="/onboarding/login" className="text-gold underline">전화번호 로그인</Link>을 사용하세요.
      </p>

      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div>
          <label htmlFor="admin-email" className="mb-2 block text-sm font-semibold text-fg2">이메일</label>
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
          <label htmlFor="admin-password" className="mb-2 block text-sm font-semibold text-fg2">비밀번호</label>
          <TextField
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <PrimaryButton type="submit" loading={loading} className="w-full">
          로그인
        </PrimaryButton>
      </form>

      <p className="text-xs text-sub">
        최초 계정:{" "}
        <code className="text-fg">scripts/createStaffUser.ts</code> (에뮬레이터·운영 공통)
      </p>
    </div>
  );
}
