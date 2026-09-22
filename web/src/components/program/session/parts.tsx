/**
 * 회차 화면 탭 패널에서 함께 쓰는 작은 조각들
 * 글자 크기: 최소 14px, 본문 16~17px (학부모용)
 */

export function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 pb-1 text-[20px] font-extrabold text-fg">{children}</h2>;
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
    <section className={`rounded-[20px] border border-line bg-card p-5 ${className}`}>
      {title && (
        // 아이콘(이모지)은 쓰지 않는다 — 제목만 깔끔하게 (icon 은 예전 호출 호환용)
        <h3 className="mb-3 text-[18px] font-bold tracking-[-0.01em] text-fg" data-icon={icon ? "" : undefined}>
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="w-[76px] shrink-0 pt-[1px] text-[16px] text-sub">{label}</span>
      <div className="min-w-0 flex-1 text-[17px] leading-[25px] text-fg">{children}</div>
    </div>
  );
}

export function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-[10px] text-[16px] leading-[25px] text-fg2">
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
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elev text-[15px] font-bold text-gold">
            {i + 1}
          </span>
          <span className="flex-1 pt-[1px] text-[16px] leading-[25px] text-fg2">{t}</span>
        </li>
      ))}
    </ol>
  );
}

export function Note({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "blue" }) {
  const cls = tone === "blue" ? "bg-elev text-fg2" : "bg-elev text-fg2";
  return <p className={`rounded-2xl px-4 py-4 text-[16px] leading-[25px] ${cls}`}>{children}</p>;
}
