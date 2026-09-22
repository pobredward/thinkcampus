import { Stack } from 'expo-router';

export default function ReportDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0c0e13' } }} />
  );
}
