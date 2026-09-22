/**
 * 프로그램 상세 Stack
 *
 *   index               회차 목록 (진행 한 줄 + 1~N회차)
 *   session/[sessionId] 회차 화면 (출결 · 일정 · 내용 · Q&A · 리포트 탭)
 *   report              종합 학습 리포트 (모든 회차가 끝난 뒤)
 *   attendance, sessions 예전 탭 주소 → 회차 목록으로 리디렉션
 *
 * 화면마다 자기 헤더를 그린다 (예전 공통 헤더 + 탭 3개 구조는 제거).
 */

import { Stack } from 'expo-router';

export default function ProgramDetailLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0c0e13' } }} />;
}
