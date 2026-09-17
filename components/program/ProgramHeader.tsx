/**
 * 프로그램 화면 공통 파란 헤더 (웹 web/src/components/program/ProgramHeader.tsx 와 같은 구성)
 *   mode="overview" : ← 홈 · 운영 정보(요일·시간·장소)
 *   mode="report"   : ← 뒤로 · "종합 학습 리포트"
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ProgramHeader({
  mode,
  studentName,
  programTitle,
  meta,
  onBack,
}: {
  mode: 'overview' | 'report';
  studentName?: string;
  programTitle: string;
  meta?: string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={8} accessibilityRole="button">
        <Text style={styles.backText}>{mode === 'overview' ? '← 홈' : '← 뒤로'}</Text>
      </TouchableOpacity>
      {!!studentName && <Text style={styles.student}>{studentName} 학생</Text>}
      <Text style={styles.title} numberOfLines={2} lineBreakStrategyIOS="hangul-word">
        {mode === 'report' ? '종합 학습 리포트' : programTitle}
      </Text>
      {mode === 'report' ? (
        <Text style={styles.meta} numberOfLines={1}>
          {programTitle}
        </Text>
      ) : (
        !!meta && <Text style={styles.meta}>{meta}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 8, marginBottom: 12 },
  backText: { fontSize: 16, fontWeight: '500', color: '#dbeafe' },
  student: { fontSize: 15, color: '#dbeafe', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: '#ffffff', lineHeight: 30 },
  meta: { marginTop: 4, fontSize: 15, lineHeight: 23, color: '#dbeafe' },
});
