/**
 * 프로그램 탭 — 회차 목록
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { DUMMY_PROGRAM } from '../../../data/dummyProgram';

export default function ProgramListScreen() {
  const program = DUMMY_PROGRAM;
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Firestore에서 프로그램 데이터 재조회
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
      }
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>프로그램</Text>
      </View>

      {/* 캠프 정보 배너 */}
      <View style={styles.banner}>
        <View style={styles.bannerInner}>
          <Text style={styles.bannerCategory}>{program.category}</Text>
          <Text style={styles.bannerTitle}>{program.title}</Text>
          <Text style={styles.bannerSub}>{program.subtitle}</Text>

          {/* 핵심 정보 칩 행 */}
          <View style={styles.bannerChips}>
            <View style={styles.bannerChip}>
              <Text style={styles.bannerChipText}>
                📅 {program.fixedDay}요일 격주
              </Text>
            </View>
            <View style={styles.bannerChip}>
              <Text style={styles.bannerChipText}>
                🕙 {program.startTime}~{program.endTime}
              </Text>
            </View>
            <View style={styles.bannerChip}>
              <Text style={styles.bannerChipText}>
                총 {program.totalSessions}회 · {program.totalHours}차시
              </Text>
            </View>
          </View>

          {/* 기간 + 장소 */}
          <Text style={styles.bannerPeriod}>
            {program.startDate} – {program.endDate}
          </Text>
          <Text style={styles.bannerLocation}>
            📍 {program.location}
          </Text>
        </View>
      </View>

      {/* 회차 목록 */}
      <Text style={styles.sectionTitle}>회차별 일정</Text>

      {program.sessions.map((session) => (
        <TouchableOpacity
          key={session.id}
          style={styles.sessionCard}
          onPress={() =>
            router.push({
              pathname: '/main/program/[programId]/session/[sessionId]',
              params: { programId: program.id, sessionId: session.id, tab: 'content' },
            })
          }
          activeOpacity={0.7}
        >
          {/* 회차 번호 */}
          <View style={styles.sessionLeft}>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeNum}>{session.sessionNumber}</Text>
              <Text style={styles.sessionBadgeLabel}>회차</Text>
            </View>
          </View>

          {/* 내용 */}
          <View style={styles.sessionBody}>
            <Text style={styles.sessionDate}>
              {session.date}　{session.startTime}~{session.endTime}
            </Text>
            <Text style={styles.sessionTopic} numberOfLines={1}>
              {session.topic}
            </Text>
            <Text style={styles.sessionInstructor}>
              강사: {session.instructor.name} · {session.sessionHours}차시({session.durationMinutes}분)
            </Text>
          </View>

          {/* 화살표 */}
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 32 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },

  banner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    overflow: 'hidden',
  },
  bannerInner: {
    padding: 20,
  },
  bannerCategory: {
    fontSize: 14,
    color: '#dbeafe',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 15,
    color: '#dbeafe',
    marginBottom: 14,
  },
  bannerChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  bannerChip: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bannerChipText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  bannerPeriod: {
    fontSize: 14,
    color: '#dbeafe',
    marginBottom: 4,
  },
  bannerLocation: {
    fontSize: 14,
    color: '#dbeafe',
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sessionCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sessionLeft: {
    marginRight: 14,
  },
  sessionBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionBadgeNum: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1d4ed8',
    lineHeight: 20,
  },
  sessionBadgeLabel: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  sessionBody: { flex: 1 },
  sessionDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 3,
  },
  sessionTopic: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  sessionInstructor: {
    fontSize: 14,
    color: '#6b7280',
  },
  arrow: {
    fontSize: 22,
    color: '#d1d5db',
    marginLeft: 8,
  },
});
