/**
 * 프로그램 화면 공통 헤더 (바탕과 같은 색 · 골드 포인트) — 웹 web/src/components/program/ProgramHeader.tsx 와 같은 구성
 *   맨 위 상단 경로 (홈 › 프로그램 …) — 누르면 그 화면으로
 *   mode="overview" : 학생 · 프로그램명 (+ 배지·한 줄 메모)
 *   mode="report"   : "종합 학습 리포트" · 프로그램명
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Breadcrumbs, type Crumb } from '../ui/Breadcrumbs';
import { C } from '../../lib/theme';

export function ProgramHeader({
  mode,
  studentName,
  programTitle,
  badge,
  note,
  crumbs,
}: {
  mode: 'overview' | 'report';
  studentName?: string;
  programTitle: string;
  /** 제목 위 작은 배지 (예: 수강 예정) */
  badge?: string;
  /** 제목 아래 한 줄 (예: 첫 수업 D-79) */
  note?: string;
  /** 상단 경로 */
  crumbs: Crumb[];
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
      <Breadcrumbs items={crumbs} style={styles.crumbs} />
      <View style={styles.topRow}>
        {!!badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {!!studentName && <Text style={styles.student}>{studentName} 학생</Text>}
      </View>
      <Text style={styles.title} numberOfLines={2} lineBreakStrategyIOS="hangul-word" accessibilityRole="header">
        {mode === 'report' ? '종합 학습 리포트' : programTitle}
      </Text>
      {mode === 'report' ? (
        <Text style={styles.sub} numberOfLines={1}>
          {programTitle}
        </Text>
      ) : (
        !!note && <Text style={styles.note}>{note}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: C.bg, paddingHorizontal: 20, paddingBottom: 16 },
  crumbs: { marginBottom: 4 },
  topRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.goldDim,
    backgroundColor: C.goldLight,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: C.goldSoft },
  student: { fontSize: 15, color: C.onInk },
  title: { marginTop: 8, fontSize: 24, lineHeight: 33, fontWeight: '800', color: C.white, letterSpacing: -0.2 },
  sub: { marginTop: 8, fontSize: 15, color: C.onInk },
  note: { marginTop: 8, fontSize: 15, fontWeight: '600', color: C.goldSoft },
});
