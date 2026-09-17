"use client";

/**
 * 기존 학부모 로그인 화면 (모바일 onboarding/login.tsx)
 * 전화번호 입력 → OTP 발송 → 인증 → enrollment 확인 → /main
 *
 * - enrollment 가 있으면 바로 메인으로 (next 파라미터가 있으면 그 경로로)
 * - enrollment 가 없으면 "등록코드가 필요합니다" 안내 후 온보딩으로 돌아감
 */

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { useBack } from "@/hooks/useBack";
import { useCountdown } from "@/hooks/useCountdown";
import { getDb, getFirebaseAuth, getFns, signInWithPhone, type ConfirmationResult } from "@/lib/firebase";
import { otpErrorMessage, smsErrorMessage } from "@/lib/errors";
import { formatPhone, maskPhone, toE164Korea } from "@/lib/phone";
import { useDialog } from "@/providers/DialogProvider";

type Step = "phone" | "otp";

/** 오픈 리다이렉트 방지 — /main 하위 경로만 허용 */
function safeNext(next: string | null): string {
  if (next && /^\/main(\/|$)/.test(next)) return next;
  return "/main";
}

export default function LoginScreen() {
  const router = useRouter();
  const dialog = useDialog();
  const goBack = useBack("/onboarding");
  const params = useSearchParams();
  const nextPath = safeNext(params.get("next"));

  const [step, setStep] = useState<Step>("phone");
  const [rawPhone, setRawPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { seconds: countdown, start: startCountdown } = useCountdown(0);
  const confirmRef = useRef<ConfirmationResult | null>(null);

  const phone = rawPhone.replace(/\D/g, "");
  const isPhoneReady = phone.length === 11;

  async function sendOtp() {
    if (!isPhoneReady || sending) return;
    setSending(true);
    try {
      confirmRef.current = await signInWithPhone(toE164Korea(phone));
      setStep("otp");
      startCountdown(60);
    } catch (e) {
      void dialog.alert("SMS 발송 실패", smsErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || sending) return;
    setOtp("");
    await sendOtp();
  }

  async function handleConfirm() {
    if (otp.length !== 6 || !confirmRef.current || loading) return;
    setLoading(true);
    try {
      // 1) OTP 인증
      const cred = await confirmRef.current.confirm(otp);
      const uid = cred.user?.uid;
      if (!uid) throw new Error("uid 없음");

      // 2) enrollment 존재 여부 확인
      const hasEnrollment = async () =>
        !(
          await getDocs(query(collection(getDb(), "enrollments"), where("guardianUid", "==", uid)))
        ).empty;

      let enrolled = await hasEnrollment();

      // 2-1) 초대받은 보호자(addGuardianPhone)라면 여기서 자동 연결
      //      모바일 원본은 온보딩 OTP 에서만 호출해서, 초대받은 보호자가 로그인 화면으로 들어오면
      //      "등록된 자녀가 없습니다" 로 막혔다. 초대 안내 문구("로그인하면 자동으로 연결")와 맞춘다.
      if (!enrolled) {
        try {
          const res = await httpsCallable<Record<string, never>, { linked: string[] }>(
            getFns(),
            "linkGuardianByPhone",
          )({});
          if (res.data.linked.length > 0) enrolled = await hasEnrollment();
        } catch {
          // 초대 내역 없음 등 — 아래 안내로 진행
        }
      }

      if (!enrolled) {
        // 등록된 자녀 없음 → 안내 후 온보딩으로
        await getFirebaseAuth().signOut();
        void dialog.alert(
          "등록된 자녀가 없습니다",
          "아직 등록코드로 자녀를 등록하지 않으셨습니다.\n등록코드를 입력해 자녀를 먼저 등록해주세요.",
          [{ text: "등록코드 입력", onPress: () => router.replace("/onboarding") }],
        );
        return;
      }

      // 3) enrollment 있음 → 메인으로
      router.replace(nextPath);
    } catch (e) {
      void dialog.alert("인증 실패", otpErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const maskedPhone = maskPhone(phone);

  return (
    <form
      className="flex flex-1 flex-col bg-white px-6 pb-10 pt-[60px]"
      onSubmit={(e) => {
        e.preventDefault();
        void (step === "phone" ? sendOtp() : handleConfirm());
      }}
    >
      {/* 뒤로가기 */}
      <button
        type="button"
        onClick={() => {
          if (step === "otp") {
            setStep("phone");
            setOtp("");
          } else {
            goBack();
          }
        }}
        className="tap mb-4 self-start text-[16px] font-medium text-brand"
      >
        ← 이전
      </button>

      {/* 로고 */}
      <div className="mb-8 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand">
          <span className="text-[22px] font-extrabold tracking-[-1px] text-white">TC</span>
        </div>
      </div>

      {step === "phone" ? (
        /* ── 전화번호 입력 단계 ── */
        <>
          <h1 className="mb-[10px] text-[26px] font-bold text-gray-900">전화번호로 로그인</h1>
          <p className="mb-9 text-[16px] leading-[26px] text-gray-500">
            등록 시 사용한 보호자 전화번호를 입력해주세요.
          </p>

          <div className="mb-6">
            <label htmlFor="phone" className="mb-2 block text-[15px] font-semibold text-gray-700">
              보호자 전화번호
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="010-0000-0000"
              maxLength={13}
              autoFocus
              value={formatPhone(rawPhone)}
              onChange={(e) => setRawPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              className={`block w-full rounded-xl border-[1.5px] px-4 py-[14px] text-[20px] tracking-[1px] text-gray-900 ${
                isPhoneReady ? "border-brand bg-brand-light" : "border-gray-200 bg-gray-50"
              }`}
            />
          </div>

          <PrimaryButton type="submit" disabled={!isPhoneReady} loading={sending} className="mb-4">
            인증번호 받기
          </PrimaryButton>

          <button
            type="button"
            onClick={() => router.replace("/onboarding")}
            className="tap py-2 text-center text-[16px] text-gray-500"
          >
            처음 등록하시나요? <span className="font-bold text-brand">등록코드 입력</span>
          </button>
        </>
      ) : (
        /* ── OTP 입력 단계 ── */
        <>
          <h1 className="mb-[10px] text-[26px] font-bold text-gray-900">인증번호 입력</h1>
          <p className="mb-9 text-[16px] leading-[26px] text-gray-500">
            <span className="font-semibold text-gray-900">{maskedPhone}</span>
            <br />
            으로 발송된 6자리 인증번호를 입력해주세요.
          </p>

          <div className="mb-6 flex flex-col items-center">
            <OtpInput value={otp} onChange={setOtp} autoFocus />
          </div>

          {/* 재발송 */}
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={countdown > 0 || sending}
            className={`tap mb-9 text-center text-[16px] ${
              countdown > 0 ? "text-gray-500" : "text-brand underline"
            }`}
          >
            {sending ? "재발송 중…" : countdown > 0 ? `재발송 (${countdown}초 후)` : "인증번호 재발송"}
          </button>

          <PrimaryButton type="submit" disabled={otp.length !== 6} loading={loading} className="mb-4">
            로그인
          </PrimaryButton>
        </>
      )}
    </form>
  );
}
