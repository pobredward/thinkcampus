"use client";

/**
 * 온보딩 Step 3 — 전화 OTP 인증 (모바일 onboarding/otp.tsx)
 * 인증 성공 시 메인 화면으로 이동
 *
 * 웹에서는 Firebase Phone Auth 에 invisible reCAPTCHA 가 자동으로 붙는다 (lib/firebase.ts).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { Spinner } from "@/components/ui/Spinner";
import { useBack } from "@/hooks/useBack";
import { useCountdown } from "@/hooks/useCountdown";
import { getFirebaseAuth, getFns, signInWithPhone, type ConfirmationResult } from "@/lib/firebase";
import { otpErrorMessage, smsErrorMessage } from "@/lib/errors";
import { clearOnboardingSession, readOnboardingSession } from "@/lib/onboardingSession";
import { maskPhone, toE164Korea } from "@/lib/phone";
import { useDialog } from "@/providers/DialogProvider";

export default function OnboardingOtp() {
  const router = useRouter();
  const dialog = useDialog();
  const goBack = useBack("/onboarding");
  // 전화번호는 이전 단계(verify)가 sessionStorage 에 저장 — 마운트 후 읽는다 (SSR 불일치 방지)
  const [phone, setPhone] = useState("");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true);
  const { seconds: resendCountdown, start: startCountdown } = useCountdown(60);
  const confirmRef = useRef<ConfirmationResult | null>(null);
  const sentOnceRef = useRef(false);

  const maskedPhone = maskPhone(phone);

  async function sendOtp(target: string = phone) {
    setSending(true);
    try {
      confirmRef.current = await signInWithPhone(toE164Korea(target));
    } catch (e) {
      void dialog.alert("SMS 발송 실패", smsErrorMessage(e), [
        { text: "이전으로", onPress: goBack },
      ]);
    } finally {
      setSending(false);
    }
  }

  // 자동 OTP 발송 (StrictMode 의 이중 실행 방지)
  useEffect(() => {
    if (sentOnceRef.current) return;
    sentOnceRef.current = true;
    const saved = readOnboardingSession()?.phone ?? "";
    if (!saved) {
      router.replace("/onboarding");
      return;
    }
    setPhone(saved);
    startCountdown(60);
    void sendOtp(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleResend() {
    if (resendCountdown > 0 || sending) return;
    setOtp("");
    startCountdown(60);
    await sendOtp();
  }

  async function handleConfirm() {
    if (otp.length !== 6) {
      void dialog.alert("확인", "6자리 인증번호를 입력해주세요.");
      return;
    }
    if (!confirmRef.current) return;

    setLoading(true);
    try {
      // 1) OTP 인증 — 전화번호 소유권 확인
      await confirmRef.current.confirm(otp);

      // 2) customToken 이 있으면 해당 uid 로 재로그인
      //    redeemCode 가 생성한 uid 에 enrollment 가 연결되어 있으므로
      //    OTP uid 대신 customToken uid 를 사용해야 데이터가 보임
      const session = readOnboardingSession();
      if (session?.customToken) {
        await signInWithCustomToken(getFirebaseAuth(), session.customToken);
      }

      // 3) 초대받은 보호자인 경우 자동 연결 (allowedGuardianPhoneHashes 기반)
      try {
        await httpsCallable(getFns(), "linkGuardianByPhone")({});
      } catch {
        // 초대 없이 등록한 경우 무시
      }

      clearOnboardingSession();
      router.replace("/main");
    } catch (e) {
      void dialog.alert("인증 실패", otpErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="flex flex-1 flex-col bg-white px-6 pb-10 pt-[60px]"
      onSubmit={(e) => {
        e.preventDefault();
        void handleConfirm();
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
      <div className="mb-8 flex gap-[6px]" aria-label="3단계 / 3단계">
        <span className="h-2 w-2 rounded-full bg-gray-200" />
        <span className="h-2 w-2 rounded-full bg-gray-200" />
        <span className="h-2 w-6 rounded-full bg-brand" />
      </div>

      <h1 className="mb-3 text-[28px] font-bold text-gray-900">인증번호 입력</h1>
      <p className="mb-10 text-[16px] leading-[26px] text-gray-500">
        <span className="font-semibold text-gray-900">{maskedPhone}</span>
        <br />
        으로 발송된 6자리 인증번호를 입력해주세요.
      </p>

      {/* OTP 입력 */}
      <div className="mb-6 flex flex-col items-center">
        {sending ? (
          <div className="flex items-center gap-[10px]">
            <Spinner />
            <span className="text-[16px] text-gray-500">인증번호 발송 중…</span>
          </div>
        ) : (
          <OtpInput value={otp} onChange={setOtp} autoFocus />
        )}
      </div>

      {/* 재발송 */}
      <button
        type="button"
        onClick={() => void handleResend()}
        disabled={resendCountdown > 0 || sending}
        className={`tap mb-10 text-center text-[16px] ${
          resendCountdown > 0 ? "text-gray-500" : "text-brand underline"
        }`}
      >
        {resendCountdown > 0 ? `재발송 (${resendCountdown}초 후)` : "인증번호 재발송"}
      </button>

      {/* 확인 버튼 */}
      <PrimaryButton type="submit" disabled={otp.length !== 6 || sending} loading={loading}>
        인증 완료
      </PrimaryButton>
    </form>
  );
}
