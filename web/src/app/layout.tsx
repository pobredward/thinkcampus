import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import "./globals.css";
import { NavigationTracker } from "@/components/NavigationTracker";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { DEMO_COOKIE, isDemoRole } from "@/lib/demoMode";
import { AuthProvider } from "@/providers/AuthProvider";
import { DemoProvider } from "@/providers/DemoProvider";
import { DialogProvider } from "@/providers/DialogProvider";
import { ToastProvider } from "@/providers/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "ThinkCampus",
    template: "%s · ThinkCampus",
  },
  description: "자녀의 교육 일정, 출결, 학습 리포트를 확인하는 ThinkCampus 학부모 서비스",
  applicationName: "ThinkCampus",
  appleWebApp: {
    capable: true,
    title: "ThinkCampus",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0e13",
};

/**
 * 루트 레이아웃 (서버) — 체험 쿠키(tc_demo)를 읽어 DemoProvider 에 넘긴다.
 * 서버가 첫 렌더부터 역할을 알고 있으므로 클라이언트와 같은 화면을 그린다 (하이드레이션 오류 없음).
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieRole = (await cookies()).get(DEMO_COOKIE)?.value;
  const demoRole = isDemoRole(cookieRole) ? cookieRole : null;

  return (
    <html lang="ko">
      <head>
        {/* 한글 본문 폰트 — Pretendard (동적 서브셋) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <div id="app-frame">
          <DemoProvider role={demoRole}>
            <ToastProvider>
              <DialogProvider>
                <AuthProvider>
                  <Suspense fallback={null}>
                    <NavigationTracker />
                    <DemoBanner />
                    {children}
                  </Suspense>
                </AuthProvider>
              </DialogProvider>
            </ToastProvider>
          </DemoProvider>
        </div>
      </body>
    </html>
  );
}
