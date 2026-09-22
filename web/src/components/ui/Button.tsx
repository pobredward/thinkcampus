"use client";

import { Spinner } from "./Spinner";

/**
 * 기본 버튼 — 골드 채움 + 잉크 글자 (모바일 앱의 `styles.button` 과 동일)
 */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  className = "",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`tap flex w-full items-center justify-center rounded-xl py-4 text-[17px] font-bold ${
        isDisabled ? "bg-brand-disabled text-faint" : "bg-gold text-ink"
      } ${className}`}
    >
      {loading ? <Spinner color="#0c0e13" /> : children}
    </button>
  );
}
