/**
 * 수강 예정 프로그램 — 수강 중 화면과 같은 구성 (진행·종합 리포트만 없음)
 * (웹 components/program/UpcomingProgram.tsx 와 같은 구성)
 *
 *   [헤더]          상단 경로(홈 › 프로그램) · 학생 · 프로그램명 · 첫 수업 D-day
 *   [수업 규정·지침] 필독 카드 하나 (맨 위)
 *   [수업 안내]     일시 및 장소 · 목적 및 내용 · 공지사항 · 자주 묻는 질문
 *   [회차별 수업]   1회차 ~ 6회차 (누르면 일정 · 내용 · Q&A)
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GuideMenu, MenuCard } from './GuideMenu';
import { ProgramHeader } from './ProgramHeader';
import { SectionHeading } from './SectionHeading';
import { SessionGrid } from './SessionGrid';
import type { Crumb } from '../ui/Breadcrumbs';
import type { Program } from '../../data/dummyProgram';
import { GUIDE_MENU_SECTIONS, GUIDE_TOP_SECTION, guideSection, type GuideSection } from '../../data/programGuide';
import type { DayItem } from '../../data/programView';
import { daysBetween, dDayLabel, dotDateToKey, todayKey } from '../../lib/dates';
import { C } from '../../lib/theme';

export function UpcomingProgram({
  program,
  studentName,
  programTitle,
  items,
  onOpenGuide,
  onOpenSession,
  crumbs,
}: {
  program: Program;
  studentName: string;
  programTitle: string;
  items: DayItem[];
  onOpenGuide: (section: GuideSection) => void;
  onOpenSession: (item: DayItem) => void;
  crumbs: Crumb[];
}) {
  const first = program.sessions[0];
  const firstKey = first ? dotDateToKey(first.date) : '';
  const days = firstKey ? daysBetween(todayKey(), firstKey) : -1;
  const dDay = days >= 0 ? dDayLabel(days) : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ProgramHeader
        mode="overview"
        studentName={studentName}
        programTitle={programTitle}
        badge="수강 예정"
        note={dDay ? `첫 수업 ${dDay}` : undefined}
        crumbs={crumbs}
      />

      <View style={styles.lift}>
        <MenuCard
          label={guideSection(GUIDE_TOP_SECTION).label}
          badge={guideSection(GUIDE_TOP_SECTION).badge}
          onPress={() => onOpenGuide(GUIDE_TOP_SECTION)}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading>수업 안내</SectionHeading>
        <GuideMenu sections={GUIDE_MENU_SECTIONS} onOpen={onOpenGuide} />
      </View>

      <View style={styles.section}>
        <SectionHeading right={`총 ${program.totalSessions}회`}>회차별 수업</SectionHeading>
        <SessionGrid items={items} next={null} onOpen={onOpenSession} />
      </View>

      {!!program.enrolledAt && <Text style={styles.foot}>수강 확정일 {program.enrolledAt}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 40 },
  lift: { paddingHorizontal: 16 },
  section: { paddingHorizontal: 16, paddingTop: 28 },
  foot: { paddingHorizontal: 20, paddingTop: 24, textAlign: 'center', fontSize: 14, color: C.faint },
});
