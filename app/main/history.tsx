/**
 * 이전 수강 이력 — 홈 맨 아래 "이전 수강 이력 보기" 버튼에서 들어온다 (웹 app/main/history/page.tsx)
 * 끝난 프로그램 목록. 누르면 그 프로그램 화면(더미 단계: 수강 중 프로그램 화면으로 대체)
 * 상단 경로: 홈 › 이전 수강 이력 (› 지난 프로그램 — via=history)
 */

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Breadcrumbs } from '../../components/ui/Breadcrumbs';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUMMY_PAST_PROGRAMS, type PastProgram } from '../../data/dummyHistory';
import { useChildren } from '../../hooks/useChildren';
import { useSelectedChild } from '../../hooks/useSelectedChild';
import { HOME_CRUMB } from '../../lib/crumbs';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user, children, loading } = useChildren({ activeOnly: true });
  const { selected } = useSelectedChild(children, user?.uid);

  // TODO: Firestore studentProgramEnrollments(status: completed) 조회
  const items = selected ? DUMMY_PAST_PROGRAMS : [];

  const open = (p: PastProgram) => {
    if (!selected) return;
    router.push({
      pathname: '/main/program/[programId]',
      params: {
        programId: p.programId,
        studentName: selected.studentName,
        programTitle: p.title,
        sid: selected.studentId,
        via: 'history', // 상단 경로: 홈 › 이전 수강 이력 › 프로그램
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Breadcrumbs items={[HOME_CRUMB, { label: '이전 수강 이력' }]} />
        {!!selected && <Text style={styles.headerSub}>{selected.studentName} 학생</Text>}
        <Text style={styles.headerTitle} accessibilityRole="header">
          이전 수강 이력
        </Text>
      </View>

      {loading && <ActivityIndicator color="#d4b06a" size="large" style={{ padding: 48 }} />}

      {!loading && items.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>끝난 프로그램이 아직 없어요.</Text>
        </View>
      )}

      {!loading && items.length > 0 && (
        <View style={styles.list}>
          {items.map((p) => (
            <TouchableOpacity
              key={p.programId}
              onPress={() => open(p)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${p.title} 수강 이력 보기`}
              style={styles.row}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.title} lineBreakStrategyIOS="hangul-word">
                  {p.title}
                </Text>
                <Text style={styles.meta}>
                  {p.startDate} ~ {p.endDate}
                </Text>
                <Text style={styles.meta}>총 {p.totalSessions}회 · 수료 완료</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0e13' },
  content: { paddingBottom: 40 },

  header: { backgroundColor: '#0c0e13', paddingHorizontal: 20, paddingBottom: 20 },
  headerSub: { marginTop: 4, fontSize: 15, color: '#9aa0ab' },
  headerTitle: { marginTop: 4, fontSize: 24, lineHeight: 33, fontWeight: '800', color: '#f2f2f0' },

  empty: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#262b36',
    backgroundColor: '#161a22',
    alignItems: 'center',
  },
  emptyText: { fontSize: 17, color: '#9aa0ab' },

  list: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#161a22',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#262b36',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  title: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#f2f2f0' },
  meta: { fontSize: 15, color: '#9aa0ab' },
  chevron: { fontSize: 24, color: '#7c8390' },
});
