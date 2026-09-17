"use client";

/**
 * 온보딩 Step 2 — 생년월일 / 관계 / 전화번호 입력 → redeemCode (모바일 onboarding/verify.tsx)
 * redeemCode 성공 시 Step 3 (OTP) 또는 기존계정 완료로 이동
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { getFns } from "@/lib/firebase";
import { errCode, errMessage } from "@/lib/errors";
import { formatBirth } from "@/lib/phone";
import { useBack } from "@/hooks/useBack";
import { saveOnboardingSession } from "@/lib/onboardingSession";
import { useDialog } from "@/providers/DialogProvider";

const RELATION_PRESETS = ["모(엄마)", "부(아빠)", "조모(할머니)", "조부(할아버지)", "기타"];

export default function OnboardingVerify() {
  const router = useRouter();
  const dialog = useDialog();
  const goBack = useBack("/onboarding");
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const campusName = params.get("campusName") ?? "";
  const maskedStudentName = params.get("maskedStudentName") ?? "";

  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [loading, setLoading] = useState(false);

  const isReady = birthDate.length === 8 && phone.length >= 10 && relation.trim().length > 0;

  async function handleSubmit() {
    if (!isReady || loading) return;
    setLoading(true);
    try {
      const fn = httpsCallable<
        { code: string; birthDate: string; phone: string; relation: string },
        { customToken?: string; existingUser?: boolean }
      >(getFns(), "redeemCode");
      const result = await fn({ code, birthDate, phone, relation: relation.trim() });
      const data = result.data;

      if (data.existingUser) {
        // 기존 계정 → 바로 메인으로
        void dialog.alert("등록 완료", "기존 계정에 자녀가 연결되었습니다.", [
          { text: "확인", onPress: () => router.replace("/main") },
        ]);
      } else if (data.customToken) {
        // 신규 계정 → OTP 인증 화면으로 (전화번호·customToken 은 URL 대신 sessionStorage)
        saveOnboardingSession({ phone, customToken: data.customToken, relation: relation.trim() });
        router.push("/onboarding/otp");
      }
    } catch (e) {
      const c = errCode(e);
      const msg =
        c === "functions/unauthenticated"
          ? errMessage(e) // "생년월일이 일치하지 않습니다 (시도 N/5)"
          : c === "functions/resource-exhausted"
            ? errMessage(e)
            : errMessage(e);
      void dialog.alert("오류", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="flex flex-1 flex-col bg-white px-6 pb-10 pt-[60px]"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={goBack}
        className="tap mb-4 self-start text-[16px] font-medium text-brand"
      >
        ← 이전
      </button>

      {/* 진행 단계 */}
      <div className="mb-6 flex gap-[6px]" aria-label="2단계 / 3단계">
        <span className="h-2 w-2 rounded-full bg-gray-200" />
        <span className="h-2 w-6 rounded-full bg-brand" />
        <span className="h-2 w-2 rounded-full bg-gray-200" />
      </div>

      <h1 className="mb-5 text-[24px] font-bold text-gray-900">자녀 정보 확인</h1>

      {/* 캠퍼스 미리보기 */}
      <div className="mb-6 overflow-hidden rounded-xl border border-green-200 bg-green-50">
        <div className="flex justify-between px-4 py-3">
          <span className="text-[15px] text-gray-500">캠퍼스</span>
          <span className="text-[15px] font-semibold text-gray-900">{campusName}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 px-4 py-3">
          <span className="text-[15px] text-gray-500">학생</span>
          <span className="text-[15px] font-semibold text-gray-900">{maskedStudentName}</span>
        </div>
      </div>

      {/* 자녀 생년월일 */}
      <div className="mb-5">
        <label htmlFor="birth" className="mb-2 block text-[15px] font-semibold text-gray-700">
          자녀 생년월일
        </label>
        <TextField
          id="birth"
          inputMode="numeric"
          placeholder="2010.03.15"
          maxLength={10}
          value={formatBirth(birthDate)}
          onChange={(e) => setBirthDate(e.target.value.replace(/\D/g, "").slice(0, 8))}
        />
      </div>

      {/* 나와의 관계 */}
      <div className="mb-5">
        <p className="mb-2 text-[15px] font-semibold text-gray-700">나와 자녀의 관계</p>
        <div className="mb-[10px] flex flex-wrap gap-2" role="group" aria-label="관계 선택">
          {RELATION_PRESETS.map((r) => {
            const active = relation === r;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => setRelation(r)}
                className={`tap rounded-[20px] border px-[14px] py-[7px] text-[15px] ${
                  active
                    ? "border-brand bg-brand-light font-semibold text-brand"
                    : "border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                {r}
              </button>
            );
          })}
        </div>
        <TextField
          aria-label="관계 직접 입력"
          placeholder="직접 입력 (예: 외조모, 고모)"
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
        />
      </div>

      {/* 보호자 전화번호 */}
      <div className="mb-5">
        <label htmlFor="phone" className="mb-2 block text-[15px] font-semibold text-gray-700">
          보호자 전화번호
        </label>
        <TextField
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="01012345678"
          maxLength={11}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
        />
        <p className="mt-[6px] text-[14px] text-gray-500">입력한 번호로 인증 문자가 발송됩니다.</p>
      </div>

      <PrimaryButton type="submit" disabled={!isReady} loading={loading} className="mt-2">
        인증번호 받기
      </PrimaryButton>
    </form>
  );
}
