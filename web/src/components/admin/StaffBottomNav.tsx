"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { StaffNavIcon, StaffNavItem } from "@/lib/staffAppNav";

function NavIcon({ name }: { name: StaffNavIcon }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />
        </svg>
      );
    case "lessons":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M14.5 20c.4-2.2 1.8-3.5 4-3.5" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M7 3h7l5 5v13H7z" />
          <path d="M14 3v6h6" />
          <path d="M10 13h6M10 17h4" />
        </svg>
      );
    case "comms":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 8.4 8.4 0 0 1-4-1L3 21l1.2-3.5A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 11.5 3 8.4 8.4 0 0 1 21 11.5z" />
        </svg>
      );
    case "import":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M8 11l4 4 4-4" />
          <path d="M4 19h16" />
        </svg>
      );
    case "runs":
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "policy":
      return (
        <svg {...common}>
          <path d="M12 3 4 7v6c0 5 3.5 7.5 8 8 4.5-.5 8-3 8-8V7l-8-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="8.5" r="3.8" />
          <path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6" />
        </svg>
      );
  }
}

export function StaffBottomNav({ items }: { items: StaffNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="스태프 메인 탭"
      className="sticky bottom-0 z-40 border-t border-line bg-paper"
      style={{ paddingBottom: "var(--sab)" }}
    >
      <ul className="flex" style={{ height: "var(--tabbar-h)" }}>
        {items.map((t) => {
          const focused = t.match(pathname);
          return (
            <li key={t.href} className="relative flex flex-1 items-center justify-center">
              {focused && (
                <span aria-hidden="true" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-gold" />
              )}
              <Link
                href={t.href}
                aria-current={focused ? "page" : undefined}
                className={`tap flex min-w-[52px] flex-col items-center justify-center gap-[2px] px-1 py-1 ${
                  focused ? "text-gold" : "text-faint"
                }`}
              >
                <NavIcon name={t.icon} />
                <span className={`text-[12px] ${focused ? "font-bold text-gold" : "font-medium text-sub"}`}>
                  {t.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
