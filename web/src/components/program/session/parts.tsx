/**
 * 회차 화면 탭 패널에서 함께 쓰는 작은 조각들
 * 글자 크기: 최소 14px, 본문 16~17px (학부모용)
 */

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 pb-1 text-[20px] font-extrabold text-gray-900">{children}</h2>;
}

export function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[20px] border border-gray-200 bg-white p-5 ${className}`}>
      {title && (
        <h3 className="mb-3 flex items-center gap-2 text-[18px] font-bold text-gray-900">
          {icon && <span aria-hidden="true">{icon}</span>}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-gray-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="w-[64px] shrink-0 pt-[1px] text-[16px] text-gray-500">{label}</span>
      <div className="min-w-0 flex-1 text-[17px] leading-[25px] text-gray-900">{children}</div>
    </div>
  );
}

export function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-[10px] text-[16px] leading-[25px] text-gray-800">
          <span className="mt-[9px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          {t}
        </li>
      ))}
    </ul>
  );
}

export function Numbered({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-[15px] font-bold text-brand">
            {i + 1}
          </span>
          <span className="flex-1 pt-[1px] text-[16px] leading-[25px] text-gray-800">{t}</span>
        </li>
      ))}
    </ol>
  );
}

export function Note({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "blue" | "amber" }) {
  const cls =
    tone === "blue"
      ? "bg-brand-light text-gray-800"
      : tone === "amber"
        ? "bg-amber-50 text-gray-800"
        : "bg-gray-50 text-gray-700";
  return <p className={`rounded-2xl px-4 py-4 text-[16px] leading-[25px] ${cls}`}>{children}</p>;
}
