/**
 * 온보딩 레이아웃
 * step1: 환영 + 등록코드 입력 (/onboarding)
 * step2: 생년월일 / 관계 / 전화번호 입력 (/onboarding/verify)
 * step3: 전화 OTP 인증 (/onboarding/otp)
 * 기존 학부모 로그인 (/onboarding/login)
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-1 flex-col bg-white">{children}</div>;
}
