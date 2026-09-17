/**
 * (이전 경로) 프로그램 상세 — 출결 탭
 * 탭 구조를 회차 목록 한 화면으로 통합하면서 /main/program/[programId] 로 옮겼다. 링크가 깨지지 않도록 리디렉션만 남긴다.
 */

import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyAttendanceRedirect() {
  const params = useLocalSearchParams<{ programId: string }>();
  return <Redirect href={{ pathname: '/main/program/[programId]', params }} />;
}
