"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

/**
 * RN TextInput 대체 — 모바일 앱 `styles.input` (border 1.5 line2, radius 10, bg elev; 포커스 골드)
 * 필요하면 className 으로 덮어쓴다 (등록코드/OTP 입력은 각 화면에서 별도 스타일).
 */
export const TextField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`block w-full rounded-[10px] border-[1.5px] border-line2 bg-elev px-[14px] py-[13px] text-[17px] text-fg placeholder:text-faint focus:border-gold ${className}`}
      />
    );
  },
);
