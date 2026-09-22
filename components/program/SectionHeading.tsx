/**
 * 섹션 제목 — 위에 짧은 골드 선을 둬서 아래 내용과 확실히 구분된다
 * (수업 안내 / 회차별 수업 처럼 화면을 나누는 큰 제목에만 쓴다)
 * (웹 components/program/SectionHeading.tsx 와 같은 모양)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../../lib/theme';

export function SectionHeading({ children, right }: { children: string; right?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.bar} />
      <View style={styles.row}>
        <Text style={styles.title} accessibilityRole="header">
          {children}
        </Text>
        {!!right && <Text style={styles.right}>{right}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 4, paddingBottom: 12 },
  bar: { width: 28, height: 3, borderRadius: 2, backgroundColor: C.gold, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  title: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: C.text, letterSpacing: -0.2 },
  right: { fontSize: 16, fontWeight: '600', color: C.sub },
});
