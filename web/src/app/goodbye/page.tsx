"use client";

/**
 * 회원 탈퇴 완료 안내 (/main 인증 가드가 signOut("withdrawn") 직후 이리로 보낸다)
 * 로그인한 채로 주소를 직접 열면 홈으로 돌려보낸다.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/providers/AuthProvider";

export default function GoodbyePage() {
  usePageTitle("탈퇴 완료");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/main");
  }, [user, router]);

  if (user !== null) return <LoadingScreen />;

  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-white px-8 text-center">
      <p aria-hidden="true" className="text-[56px]">
        👋
      </p>
      <h1 className="mt-4 text-[24px] font-extrabold text-gray-900">탈퇴가 완료되었어요</h1>
      <p className="mt-3 text-[17px] leading-[27px] text-gray-700">
        그동안 씽크캠퍼스를 이용해 주셔서 감사합니다.
        <br />
        다시 이용하시려면 캠퍼스에서 등록코드를 받아 주세요.
      </p>
      <button
        type="button"
        onClick={() => router.replace("/onboarding")}
        className="tap mt-10 w-full max-w-[320px] rounded-2xl bg-brand py-4 text-[17px] font-bold text-white"
      >
        처음 화면으로
      </button>
    </div>
  );
}
