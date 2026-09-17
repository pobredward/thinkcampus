/**
 * 루트 레이아웃
 * - SafeAreaProvider 를 최상위에 감싸야 useSafeAreaInsets 가 작동함
 */

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Slot />
    </SafeAreaProvider>
  );
}
