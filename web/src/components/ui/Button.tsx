"use client";

import { Spinner } from "./Spinner";

/**
 * 파란 기본 버튼 — 모바일 앱의 `styles.button` (#1d4ed8, radius 12, py 16) 과 동일
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
      className={`tap flex w-full items-center justify-center rounded-xl py-4 text-[17px] font-bold text-white ${
        isDisabled ? "bg-brand-disabled" : "bg-brand"
      } ${className}`}
    >
      {loading ? <Spinner color="#fff" /> : children}
    </button>
  );
}
