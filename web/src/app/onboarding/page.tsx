"use client";

/**
 * 온보딩 Step 1 — 환영 화면 + 등록코드 입력 (모바일 onboarding/index.tsx)
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
import { getFns } from "@/lib/firebase";
import { errCode, errMessage } from "@/lib/errors";
import { formatCode } from "@/lib/phone";
import { useDialog } from "@/providers/DialogProvider";

export default function OnboardingStep1() {
  const router = useRouter();
  const dialog = useDialog();
  const [rawCode, setRawCode] = useState("");
  const [loading, setLoading] = useState(false);

  const code = rawCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const isReady = code.length === 9;

  async function handleNext() {
    if (!isReady) {
      void dialog.alert("코드 확인", "9자리 등록코드를 입력해주세요.\n예) DS26-A3F7K");
      return;
    }
    setLoading(true);
    try {
      const fn = httpsCallable<{ code: string }, { campusName: string; maskedStudentName: string }>(
        getFns(),
        "previewCode",
      );
      const result = await fn({ code: formatCode(code) });
      const data = result.data;
      // 다음 단계로 코드 + 미리보기 데이터 전달
      const qs = new URLSearchParams({
        code: formatCode(code),
        campusName: data.campusName,
        maskedStudentName: data.maskedStudentName,
      });
      router.push(`/onboarding/verify?${qs.toString()}`);
    } catch (e) {
      const c = errCode(e);
      const msg =
        c === "functions/not-found"
          ? "존재하지 않는 등록코드입니다."
          : c === "functions/already-exists"
            ? "이미 사용된 등록코드입니다."
            : c === "functions/deadline-exceeded"
              ? "만료된 등록코드입니다."
              : errMessage(e);
      void dialog.alert("오류", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-white px-6 pb-10 pt-20">
      {/* 상단 헤더 */}
      <div className="mb-10 flex flex-col items-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-[18px] bg-brand">
          <span className="text-[24px] font-extrabold tracking-[-1px] text-white">TC</span>
        </div>
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-gray-900">ThinkCampus</h1>
        <p className="mt-1 text-[16px] text-gray-500">학부모 전용 서비스</p>
      </div>

      {/* 안내 문구 */}
      <div className="mb-8 rounded-xl bg-brand-light p-4">
        <p className="mb-[6px] text-[16px] font-semibold text-brand">📌 등록코드 안내</p>
        <p className="text-[15px] leading-[22px] text-gray-700">
          캠퍼스 담당자에게 받은 등록코드를 입력해주세요.
          <br />
          자녀의 교육 일정과 피드백을 확인할 수 있습니다.
        </p>
      </div>

      {/* 코드 입력 */}
      <form
        className="mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          void handleNext();
        }}
      >
        <label htmlFor="code" className="mb-2 block text-[15px] font-semibold text-gray-700">
          등록코드
        </label>
        <input
          id="code"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="DS26-A3F7K"
          maxLength={10}
          value={formatCode(rawCode)}
          onChange={(e) => setRawCode(e.target.value.replace(/[^A-Z0-9]/gi, "").toUpperCase())}
          className={`block w-full rounded-[10px] border-[1.5px] p-[14px] text-center text-[24px] font-semibold tracking-[4px] ${
            isReady
              ? "border-brand bg-brand-light text-brand"
              : "border-gray-300 bg-gray-50 text-gray-900"
          }`}
        />
        {isReady && <p className="mt-[6px] text-center text-[14px] text-brand">✓ 코드 확인 완료</p>}

        {/* 다음 버튼 */}
        <PrimaryButton type="submit" disabled={!isReady} loading={loading} className="mt-6 mb-5">
          다음
        </PrimaryButton>
      </form>

      <p className="text-center text-[15px] leading-[22px] text-gray-500">
        등록코드가 없으신가요?
        <br />
        자녀가 등록된 캠퍼스에 문의해주세요.
      </p>

      {/* 기존 학부모 로그인 */}
      <Link href="/onboarding/login" className="tap mt-4 block py-2 text-center text-[16px] text-gray-500">
        이미 등록하셨나요? <span className="font-bold text-brand">전화번호로 로그인</span>
      </Link>
    </div>
  );
}
