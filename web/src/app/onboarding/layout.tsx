/**
 * 온보딩 레이아웃
 * step1: 환영 + 등록코드 입력 (/onboarding)
 * step2: 생년월일 / 관계 / 전화번호 입력 (/onboarding/verify)
 * step3: 전화 OTP 인증 (/onboarding/otp)
 * 기존 학부모 로그인 (/onboarding/login)
 *
 * 체험 모드(lib/demo.ts)에서는 등록코드 없이 바로 메인으로 보낸다.
 */
import { DemoRedirect } from "@/components/DemoRedirect";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-card">
      <DemoRedirect>{children}</DemoRedirect>
    </div>
  );
}
