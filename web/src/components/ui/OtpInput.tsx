"use client";

/**
 * 6자리 인증번호 입력 — 모바일 `styles.otpInput` (36px, letterSpacing 12, 밑줄 파랑)
 * iOS Safari 의 SMS 자동완성을 위해 autoComplete="one-time-code"
 */
export function OtpInput({
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="one-time-code"
      placeholder="000000"
      maxLength={6}
      autoFocus={autoFocus}
      disabled={disabled}
      aria-label="6자리 인증번호"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="block w-[220px] border-b-2 border-gold bg-transparent pb-2 text-center text-[36px] font-bold tracking-[12px] text-fg placeholder:text-faint"
    />
  );
}
