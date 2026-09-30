"use client";

/**
 * 발주처 담당자 로그인 — 이메일 · 비밀번호 (통합 관리자가 초대하며 준 임시 비밀번호)
 *   첫 로그인(mustChangePassword)이면 새 비밀번호를 정하게 한다 → completeOfficerPasswordChange
 *   ?change=1 : 이미 로그인한 상태에서 비밀번호 바꾸기 단계로 바로
 *   체험 중이면 /partner 로 (DemoRedirect)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DemoRedirect } from "@/components/demo/DemoRedirect";
import { PrimaryButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { usePageTitle } from "@/hooks/usePageTitle";
import { DEMO_HUB_PATH } from "@/lib/demoMode";
import { errMessage } from "@/lib/errors";
import { changeCurrentUserPassword, signInWithStaffEmail } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { useApi } from "@/services";

function safeNext(next: string | null): string {
  return next && /^\/partner(\/|$)/.test(next) && !next.startsWith("/partner/login") ? next : "/partner";
}

export default function PartnerLoginPage() {
  return (
    <DemoRedirect>
      <PartnerLogin />
    </DemoRedirect>
  );
}

function PartnerLogin() {
  usePageTitle("발주처 담당자 로그인");
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const api = useApi();
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<"login" | "change">(params.get("change") === "1" ? "change" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 이미 로그인돼 있으면 (비밀번호 바꿀 필요가 없을 때) 바로 포털로
  useEffect(() => {
    if (!user || step !== "login") return;
    let alive = true;
    void api.partner
      .getAccess()
      .then((a) => {
        if (!alive || !a.allowed) return;
        if (a.mustChangePassword) setStep("change");
        else router.replace(next);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, step, api, router, next]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("이메일과 비밀번호를 입력해 주세요.");
    setLoading(true);
    setError(null);
    try {
      await signInWithStaffEmail(email, password);
      const access = await api.partner.getAccess();
      if (!access.allowed) {
        await signOut();
        setError("발주처 담당자 계정이 아니에요. 씽크캠퍼스 통합 관리자에게 문의해 주세요.");
        return;
      }
      if (access.mustChangePassword) setStep("change");
      else router.replace(next);
    } catch (err) {
      setError(errMessage(err, "로그인에 실패했어요. 이메일 · 비밀번호를 확인해 주세요."));
    } finally {
      setLoading(false);
    }
  }

  async function change(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw1.length < 8 || !/[A-Za-z]/.test(pw1) || !/[0-9]/.test(pw1)) return setError("영문과 숫자를 섞어 8자 이상으로 정해 주세요.");
    if (pw1 !== pw2) return setError("두 비밀번호가 달라요.");
    setLoading(true);
    try {
      await changeCurrentUserPassword(pw1);
      await api.partner.completePasswordChange();
      router.replace(next);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "auth/requires-recent-login") {
        await signOut();
        setStep("login");
        setError("보안을 위해 임시 비밀번호로 다시 로그인한 뒤 바꿔 주세요.");
      } else setError(errMessage(err, "비밀번호를 바꾸지 못했어요."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10" data-full-width="true">
      <div>
        <p className="text-[15px] font-bold text-gold">씽크캠퍼스</p>
        <h1 className="mt-1 text-[26px] font-extrabold text-fg">{step === "change" ? "새 비밀번호 정하기" : "발주처 담당자 로그인"}</h1>
        <p className="mt-2 text-[16px] leading-[24px] text-sub">
          {step === "change" ? "처음 로그인하셨어요. 임시 비밀번호 대신 쓸 비밀번호를 정해 주세요." : "지자체 담당자는 씽크캠퍼스에서 안내받은 이메일과 비밀번호로 로그인해요."}
        </p>
      </div>

      {step === "login" ? (
        <form className="space-y-4" onSubmit={(e) => void login(e)}>
          <div>
            <label htmlFor="p-email" className="mb-2 block text-[15px] font-semibold text-fg2">
              이메일
            </label>
            <TextField id="p-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@korea.kr" />
          </div>
          <div>
            <label htmlFor="p-password" className="mb-2 block text-[15px] font-semibold text-fg2">
              비밀번호
            </label>
            <TextField id="p-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-[15px] text-danger">{error}</p>}
          <PrimaryButton type="submit" loading={loading} className="w-full">
            로그인
          </PrimaryButton>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void change(e)}>
          <div>
            <label htmlFor="p-new" className="mb-2 block text-[15px] font-semibold text-fg2">
              새 비밀번호
            </label>
            <TextField id="p-new" type="password" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
            <p className="mt-1 text-[14px] text-sub">영문과 숫자를 섞어 8자 이상</p>
          </div>
          <div>
            <label htmlFor="p-new2" className="mb-2 block text-[15px] font-semibold text-fg2">
              한 번 더
            </label>
            <TextField id="p-new2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          {error && <p className="text-[15px] text-danger">{error}</p>}
          <PrimaryButton type="submit" loading={loading} className="w-full">
            비밀번호 바꾸고 시작하기
          </PrimaryButton>
        </form>
      )}

      <p className="text-[14px] text-faint">
        화면을 먼저 보려면{" "}
        <Link href={DEMO_HUB_PATH} className="text-gold underline">
          체험판
        </Link>
        에서 발주처 담당자를 골라 보세요.
      </p>
    </div>
  );
}
