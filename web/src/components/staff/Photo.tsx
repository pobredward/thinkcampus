"use client";

/**
 * 학생·강사 사진 — 실제 Storage URL 이 있을 때만 사진, 없으면 단색 기본 프로필 (실사·일러스트 없음)
 */

export function Photo({
  id,
  name,
  photoUrl,
  size = 56,
  className = "",
}: {
  id: string;
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const src = photoUrl?.trim() || null;

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl border border-line bg-elev ${className}`}
      style={{ width: size, height: size }}
      data-photo-id={id}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const fb = e.currentTarget.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
      ) : null}
      <span
        className={`absolute inset-0 flex items-center justify-center bg-line text-fg2 ${
          src ? "hidden" : ""
        }`}
        style={{ fontSize: Math.round(size * 0.38) }}
        aria-hidden
      >
        <DefaultProfileIcon size={Math.round(size * 0.45)} />
      </span>
      {!src && (
        <span className="sr-only">{name}</span>
      )}
    </div>
  );
}

/** 단색 기본 프로필 (실사·일러스트 없음) */
function DefaultProfileIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path
        opacity="0.35"
        d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm0 2c-3.3 0-6 1.3-6 3v1h12v-1c0-1.7-2.7-3-6-3z"
      />
    </svg>
  );
}
