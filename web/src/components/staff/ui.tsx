"use client";

/**
 * 직원 앱 공통 조각 — 미드나잇 토큰, 글자 14px 이상, 터치 44px, 이모지·그림자 없음
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function PageTitle({ title, desc, right, eyebrow }: { title: string; desc?: string; right?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-[14px] font-bold text-gold">{eyebrow}</p>}
        <h1 className="text-[24px] font-extrabold leading-[32px] tracking-[-0.01em] text-fg">{title}</h1>
        {desc && <p className="mt-1 text-[15px] leading-[22px] text-sub">{desc}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between gap-2 first:mt-0">
      <h2 className="text-[17px] font-bold text-fg">{children}</h2>
      {right && <div className="text-[14px] text-sub">{right}</div>}
    </div>
  );
}

export function Card({ children, className = "", tone = "card" }: { children: ReactNode; className?: string; tone?: "card" | "card2" | "gold" }) {
  const bg = tone === "card2" ? "bg-card2 border-line" : tone === "gold" ? "bg-card border-gold-dim" : "bg-card border-line";
  return <div className={`rounded-[18px] border p-4 ${bg} ${className}`}>{children}</div>;
}

/** 큰 숫자 하나 — 대시보드 */
export function Stat({ label, value, unit, tone = "fg", href, hint }: { label: string; value: number | string; unit?: string; tone?: "fg" | "gold" | "danger" | "late"; href?: string; hint?: string }) {
  const color = tone === "gold" ? "text-gold" : tone === "danger" ? "text-danger" : tone === "late" ? "text-late" : "text-fg";
  const body = (
    <>
      <p className="text-[14px] font-semibold text-sub">{label}</p>
      <p className={`mt-1 text-[26px] font-extrabold leading-[32px] ${color}`}>
        {value}
        {unit && <span className="ml-[2px] text-[15px] font-semibold text-sub">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-[14px] text-sub">{hint}</p>}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="tap block rounded-[18px] border border-line bg-card p-4 hover:border-gold-dim">
        {body}
      </Link>
    );
  }
  return <div className="rounded-[18px] border border-line bg-card p-4">{body}</div>;
}

export type ChipTone = "neutral" | "gold" | "danger" | "late" | "dim";

const CHIP_TONE: Record<ChipTone, string> = {
  neutral: "border-line bg-elev text-fg2",
  gold: "border-gold-border bg-gold-light text-gold",
  danger: "border-danger-border bg-danger-bg text-danger",
  late: "border-late/40 bg-late-bg text-late",
  dim: "border-line bg-card2 text-sub",
};

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: ChipTone; className?: string }) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-[2px] text-[14px] font-bold ${CHIP_TONE[tone]} ${className}`}>{children}</span>;
}

/** 필터 칩 (가로 스크롤) */
export function ChipRow<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Array<{ id: T; label: string; count?: number }>;
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      {items.map((it) => {
        const on = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(it.id)}
            className={`tap flex h-11 shrink-0 items-center gap-1 rounded-full border px-4 text-[15px] font-semibold ${
              on ? "border-gold bg-gold-light text-gold" : "border-line bg-card text-fg2"
            }`}
          >
            {it.label}
            {it.count !== undefined && <span className={on ? "text-gold" : "text-sub"}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  className = "",
  type = "button",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const isDisabled = disabled || loading;
  const base = "tap inline-flex items-center justify-center gap-1 rounded-xl font-bold";
  const sizing = size === "lg" ? "min-h-[52px] px-5 text-[17px]" : size === "sm" ? "min-h-[40px] px-3 text-[14px]" : "min-h-[44px] px-4 text-[15px]";
  const look =
    variant === "primary"
      ? isDisabled
        ? "bg-line2 text-faint"
        : "bg-gold text-ink"
      : variant === "danger"
        ? "border border-danger-border bg-danger-bg text-danger"
        : variant === "ghost"
          ? "text-gold"
          : "border border-line2 bg-elev text-fg2";
  const cls = `${base} ${sizing} ${look} ${className}`;
  if (href && !isDisabled) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={isDisabled} className={cls} aria-label={ariaLabel}>
      {loading ? <Spinner color={variant === "primary" ? "#0c0e13" : "#d4b06a"} /> : children}
    </button>
  );
}

export function Field({ label, htmlFor, hint, children, required }: { label: string; htmlFor?: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-[15px] font-semibold text-fg2">
        {label}
        {required && <span className="ml-1 text-gold">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[14px] text-sub">{hint}</p>}
    </div>
  );
}

export const inputClass = "block w-full rounded-[10px] border-[1.5px] border-line2 bg-elev px-[14px] py-[12px] text-[16px] text-fg placeholder:text-faint focus:border-gold";

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputClass} ${className}`} />;
}

export function Loading({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14" role="status">
      <Spinner size="large" />
      <span className="text-[15px] text-sub">{label}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[18px] border border-danger-border bg-danger-bg p-4">
      <p className="text-[15px] leading-[22px] text-danger">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="tap mt-2 text-[15px] font-bold text-gold underline underline-offset-2">
          다시 시도
        </button>
      )}
    </div>
  );
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-dashed border-line2 bg-card2 px-5 py-8 text-center">
      <p className="text-[17px] font-bold text-fg2">{title}</p>
      {desc && <p className="mt-1 text-[15px] leading-[22px] text-sub">{desc}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** 오른쪽 화살표가 있는 행 */
export function RowLink({ href, onClick, title, desc, badge, left }: { href?: string; onClick?: () => void; title: ReactNode; desc?: ReactNode; badge?: ReactNode; left?: ReactNode }) {
  const inner = (
    <>
      {left && <span className="shrink-0">{left}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-bold text-fg">{title}</span>
        {desc && <span className="mt-[2px] block text-[14px] leading-[20px] text-sub">{desc}</span>}
      </span>
      {badge && <span className="shrink-0">{badge}</span>}
      <span aria-hidden="true" className="shrink-0 text-[20px] leading-none text-faint">
        ›
      </span>
    </>
  );
  const cls = "tap flex w-full items-center gap-3 rounded-[16px] border border-line bg-card px-4 py-[14px] text-left hover:border-gold-dim";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export function KeyValue({ items }: { items: Array<{ k: string; v: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
      {items.map((it) => (
        <div key={it.k} className="contents">
          <dt className="text-[14px] font-semibold text-sub">{it.k}</dt>
          <dd className="text-[15px] text-fg2">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** 'YYYY-MM-DD' → '9월 26일 (토)' */
export function fmtDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

/** ISO → '9.26 14:05' */
export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
