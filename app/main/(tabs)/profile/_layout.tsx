/**
 * 내 정보 Stack — index(내 정보) · withdraw(회원 탈퇴)
 */

import { Stack } from 'expo-router';

export default function ProfileLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0c0e13' } }} />;
}
