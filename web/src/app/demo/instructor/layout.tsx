"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEMO_HUB_PATH, DEMO_ROLE_PATH } from "@/lib/demoPortal";

const NAV = [
  { href: DEMO_ROLE_PATH.instructor, label: "오늘", match: (p: string) => p === DEMO_ROLE_PATH.instructor },
  {
    href: `${DEMO_ROLE_PATH.instructor}/classes`,
    label: "담당 반",
    match: (p: string) => p.startsWith(`${DEMO_ROLE_PATH.instructor}/classes`),
  },
  {
    href: `${DEMO_ROLE_PATH.instructor}/profile`,
    label: "내 정보",
    match: (p: string) => p.startsWith(`${DEMO_ROLE_PATH.instructor}/profile`),
  },
];

export default function InstructorDemoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <div className="flex flex-1 flex-col">{children}</div>
      <nav
        aria-label="강사 탭"
        className="sticky bottom-0 z-40 border-t border-line bg-paper"
        style={{ paddingBottom: "var(--sab)" }}
      >
        <ul className="flex" style={{ height: "var(--tabbar-h)" }}>
          {NAV.map((t) => {
            const focused = t.match(pathname);
            return (
              <li key={t.href} className="relative flex flex-1 items-center justify-center">
                {focused && (
                  <span aria-hidden="true" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-gold" />
                )}
                <Link
                  href={t.href}
                  aria-current={focused ? "page" : undefined}
                  className={`tap flex min-w-[56px] flex-col items-center justify-center px-2 py-1 text-[14px] ${
                    focused ? "font-bold text-gold" : "font-medium text-sub"
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="border-t border-line bg-elev py-2 text-center text-xs text-faint">
        <Link href={DEMO_HUB_PATH} className="underline">체험판 홈</Link>
      </p>
    </div>
  );
}
