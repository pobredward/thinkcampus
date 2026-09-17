/**
 * 온보딩 스택 레이아웃
 * step1: 환영 + 등록코드 입력
 * step2: 생년월일 / 관계 / 전화번호 입력
 * step3: 전화 OTP 인증
 */

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
