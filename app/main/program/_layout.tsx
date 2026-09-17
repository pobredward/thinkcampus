/**
 * 프로그램 Stack 레이아웃
 *
 * 경로:
 *   /main/program                                   → 프로그램 회차 목록 (전체 일정)
 *   /main/program/[programId]                       → 회차 목록 (학생 출결 포함)
 *   /main/program/[programId]/session/[sessionId]   → 회차 화면 (출결 · 일정 · 내용 · Q&A · 리포트)
 *   /main/program/[programId]/report                → 종합 리포트
 *
 * 예전 회차 상세 /main/program/[sessionId] 는 [programId] 와 경로가 겹쳐 제거했다.
 * sess- 로 시작하는 주소로 들어오면 [programId] 화면이 회차 화면 "내용" 탭으로 보낸다.
 */

import { Stack } from 'expo-router';

export default function ProgramLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
