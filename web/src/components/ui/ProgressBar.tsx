/**
 * 진도 바 — 회색 트랙(#e5e7eb) 위 파란 채움(#1d4ed8)
 */
export function ProgressBar({
  value,
  height = 8,
  color = "#1d4ed8",
  track = "#e5e7eb",
  className = "",
}: {
  /** 0 ~ 1 */
  value: number;
  height?: number;
  color?: string;
  track?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`w-full overflow-hidden ${className}`}
      style={{ height, borderRadius: height / 2, backgroundColor: track }}
    >
      <div
        className="h-full transition-[width] duration-300"
        style={{ width: `${pct}%`, borderRadius: height / 2, backgroundColor: color }}
      />
    </div>
  );
}
