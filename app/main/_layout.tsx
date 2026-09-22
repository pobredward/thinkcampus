/**
 * 메인 Stack — 탭(홈 / 알림 / 내 정보) 위에 상세 화면을 쌓는다
 *
 *   (tabs)                    홈 · 알림 · 내 정보 (하단 탭바)
 *   program/...               프로그램 · 회차 · 안내(목적·회차별 내용·공지·규정·Q&A) · 종합 리포트
 *   history                   이전 수강 이력
 *   faq                       FAQ · 챗봇 (회차 Q&A 에서 오면 뒤로가기로 그 회차로)
 *   attendance, report, report_detail   예전 화면
 *
 * 예전에는 상세 화면을 숨은 탭으로 두었는데, 탭은 안의 스택을 기억해서
 * 다른 프로그램을 연 뒤 "← 홈"을 누르면 예전 프로그램 화면이 다시 나오는 문제가 있었다.
 * 상세 화면을 탭 위 Stack 으로 올려 뒤로가기가 항상 들어온 순서대로 동작한다.
 */

import { Stack } from 'expo-router';

export default function MainLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0c0e13' } }} />;
}
