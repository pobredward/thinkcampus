/**
 * 이전 수강 이력 — 홈 맨 아래 "이전 수강 이력 보기" 버튼에서 들어온다 (웹 app/main/history/page.tsx)
 * 끝난 프로그램 목록. 누르면 그 프로그램 화면(더미 단계: 수강 중 프로그램 화면으로 대체)
 */

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DUMMY_PAST_PROGRAMS, type PastProgram } from '../../data/dummyHistory';
import { useChildren } from '../../hooks/useChildren';
import { useSelectedChild } from '../../hooks/useSelectedChild';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user, children, loading } = useChildren({ activeOnly: true });
  const { selected } = useSelectedChild(children, user?.uid);

  // TODO: Firestore enrollments(status: completed) 조회
  const items = selected ? DUMMY_PAST_PROGRAMS : [];

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/main');
  };

  const open = (p: PastProgram) => {
    if (!selected) return;
    router.push({
      pathname: '/main/program/[programId]',
      params: {
        programId: p.programId,
        studentName: selected.studentName,
        programTitle: p.title,
        sid: selected.studentId,
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={goHome} style={styles.backBtn} hitSlop={8} accessibilityRole="button">
          <Text style={styles.backText}>← 홈</Text>
        </TouchableOpacity>
        {!!selected && <Text style={styles.headerSub}>{selected.studentName} 학생</Text>}
        <Text style={styles.headerTitle} accessibilityRole="header">
          📂 이전 수강 이력
        </Text>
      </View>

      {loading && <ActivityIndicator color="#1d4ed8" size="large" style={{ padding: 48 }} />}

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
              <View style={styles.iconBox}>
                <Text style={styles.icon}>✅</Text>
              </View>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },

  header: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 16, fontWeight: '500', color: '#dbeafe' },
  headerSub: { marginTop: 8, fontSize: 15, color: '#dbeafe' },
  headerTitle: { marginTop: 4, fontSize: 24, lineHeight: 32, fontWeight: '800', color: '#ffffff' },

  empty: {
    margin: 20,
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  emptyText: { fontSize: 17, color: '#4b5563' },

  list: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  title: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#111827' },
  meta: { fontSize: 15, color: '#4b5563' },
  chevron: { fontSize: 24, color: '#9ca3af' },
});
