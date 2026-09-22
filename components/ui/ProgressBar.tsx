/**
 * 진도 바 — 어두운 트랙(#262b36) 위 골드 채움(#d4b06a) (웹 components/ui/ProgressBar.tsx 와 같은 값)
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function ProgressBar({
  value,
  height = 8,
  color = '#9a7b2f',
  track = '#262b36',
  style,
}: {
  /** 0 ~ 1 */
  value: number;
  height?: number;
  color?: string;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}
    >
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}
