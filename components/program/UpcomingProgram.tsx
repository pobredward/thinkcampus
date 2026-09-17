/**
 * 수강 예정 프로그램 — 첫 화면은 아주 단순하게 (웹 components/program/UpcomingProgram.tsx 와 같은 구성)
 *
 *   [파란 헤더]   학생 · 프로그램명
 *   [수업 요약]   수강 예정 · 첫 수업 D-day / 기간(첫 수업 ~ 마지막 수업) / 일시(휴강) / 장소
 *   [안내 버튼]   프로그램 목적 · 회차별 내용 · 공지사항 · 수업 규정·지침 · 자주 묻는 질문 · 문의하기
 *
 * 자세한 내용은 버튼을 눌러 안내 페이지(/main/program/[programId]/guide/<항목>)에서 본다.
 * 회차별 내용 → 회차를 누르면 회차 화면(일정 · 내용 · Q&A)
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { GuideMenu } from './GuideMenu';
import { openGuide } from './GuideScreen';
import { ProgramHeader } from './ProgramHeader';
import type { Program } from '../../data/dummyProgram';
import { GUIDE_SECTIONS, periodLine, scheduleLine, type GuideSection } from '../../data/programGuide';
import { daysBetween, dDayLabel, dotDateToKey, formatKoreanDate, todayKey } from '../../lib/dates';

export function UpcomingProgram({
  program,
  studentName,
  programTitle,
  passParams,
  onBack,
}: {
  program: Program;
  studentName: string;
  programTitle: string;
  /** 화면 사이에 넘길 값 (studentName · programTitle · sid) */
  passParams: Record<string, string>;
  onBack: () => void;
}) {
  const first = program.sessions[0];
  const firstKey = first ? dotDateToKey(first.date) : '';
  const days = firstKey ? daysBetween(todayKey(), firstKey) : -1;
  const dDay = days >= 0 ? dDayLabel(days) : '';
  const breaks = program.breaks ?? [];

  const onOpenGuide = (section: GuideSection) => openGuide(program.id, section, passParams);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgramHeader mode="overview" studentName={studentName} programTitle={programTitle} onBack={onBack} />

      {/* ── 수업 요약 ───────────────────────── */}
      <View style={styles.summary} accessibilityLabel="수업 요약">
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: '#f5f3ff' }]}>
            <Text style={[styles.badgeText, { color: '#6d28d9' }]}>🗓 수강 예정</Text>
          </View>
          {!!dDay && (
            <View style={[styles.badge, { backgroundColor: '#1d4ed8' }]}>
              <Text style={[styles.badgeText, { color: '#ffffff' }]}>첫 수업 {dDay}</Text>
            </View>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <SummaryRow label="기간">
            <Text style={styles.value}>
              {periodLine(program)}
              <Text style={styles.valueSub}> · 총 {program.totalSessions}회</Text>
            </Text>
          </SummaryRow>
          <SummaryRow label="일시">
            <Text style={styles.value}>{scheduleLine(program)}</Text>
            {breaks.map((b) => (
              <Text key={b.date} style={styles.breakText}>
                ⏸ {formatKoreanDate(dotDateToKey(b.date))} {b.reason}
              </Text>
            ))}
          </SummaryRow>
          <SummaryRow label="장소">
            <Text style={styles.value} lineBreakStrategyIOS="hangul-word">
              {program.location}
            </Text>
          </SummaryRow>
        </View>
      </View>

      {/* ── 안내 버튼 ───────────────────────── */}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        무엇이 궁금하세요?
      </Text>
      <View style={{ paddingHorizontal: 16 }}>
        <GuideMenu
          sections={GUIDE_SECTIONS.map((s) => s.id)}
          noticeCount={program.notices?.length}
          onOpen={onOpenGuide}
          onContact={() => router.push({ pathname: '/main/faq', params: { tab: 'chatbot', from: 'program' } })}
        />
      </View>
      {!!program.enrolledAt && <Text style={styles.enrolled}>수강 확정일 {program.enrolledAt}</Text>}
    </ScrollView>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },

  summary: {
    marginHorizontal: 16,
    marginTop: -12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    padding: 20,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 16 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 15, fontWeight: '700' },

  row: { flexDirection: 'row', gap: 12 },
  label: { width: 44, paddingTop: 1, fontSize: 16, color: '#6b7280' },
  value: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: '#111827' },
  valueSub: { fontWeight: '500', color: '#4b5563' },
  breakText: { fontSize: 15, fontWeight: '600', color: '#b45309' },

  sectionTitle: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  enrolled: { paddingTop: 16, textAlign: 'center', fontSize: 14, color: '#6b7280' },
});
