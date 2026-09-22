/**
 * 루트 레이아웃
 * - SafeAreaProvider 를 최상위에 감싸야 useSafeAreaInsets 가 작동함
 */

import { DarkTheme, Slot, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C } from '../lib/theme';

// 미드나잇(다크) — 네비게이션 바탕도 같은 색으로 맞춰 화면 전환 때 밝은 화면이 비치지 않게
const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, text: C.fg, border: C.line, primary: C.gold },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: C.bg }}>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Slot />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
