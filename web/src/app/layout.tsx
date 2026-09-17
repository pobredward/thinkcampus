import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { NavigationTracker } from "@/components/NavigationTracker";
import { AuthProvider } from "@/providers/AuthProvider";
import { DialogProvider } from "@/providers/DialogProvider";
import { ToastProvider } from "@/providers/ToastProvider";

export const metadata: Metadata = {
  title: {
    default: "ThinkCampus 학부모",
    template: "%s · ThinkCampus",
  },
  description: "자녀의 교육 일정, 출결, 학습 리포트를 확인하는 ThinkCampus 학부모 전용 서비스",
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
  themeColor: "#1d4ed8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
          <ToastProvider>
            <DialogProvider>
              <AuthProvider>
                <Suspense fallback={null}>
                  <NavigationTracker />
                  {children}
                </Suspense>
              </AuthProvider>
            </DialogProvider>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
