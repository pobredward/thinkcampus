/**
 * 진도 바 — 회색 트랙(#e5e7eb) 위 파란 채움(#1d4ed8)
 */

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

export function ProgressBar({
  value,
  height = 8,
  color = '#1d4ed8',
  track = '#e5e7eb',
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
