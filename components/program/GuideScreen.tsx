/**
 * 프로그램 안내 페이지 공통 틀 — 파란 헤더(← 돌아가기 · 프로그램명 · 제목) + 본문
 * (웹 web/src/components/program/GuidePage.tsx)
 *
 * 안내 페이지는 서로 독립이다: app/main/program/[programId]/guide/{purpose,sessions,notices,rules,qna}.tsx
 * 새 안내를 추가할 때 → data/programGuide.ts 에 항목 추가 + 아래 GUIDE_PATHNAMES 에 한 줄 + 페이지 파일 하나.
 *
 * params: programId · studentName · programTitle · sid · from(home 이면 "← 홈")
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Program } from '../../data/dummyProgram';
import { guideSection, type GuideSection } from '../../data/programGuide';
import { getDummyProgram, isUpcomingProgram } from '../../data/programView';

const GUIDE_PATHNAMES = {
  purpose: '/main/program/[programId]/guide/purpose',
  sessions: '/main/program/[programId]/guide/sessions',
  notices: '/main/program/[programId]/guide/notices',
  rules: '/main/program/[programId]/guide/rules',
  qna: '/main/program/[programId]/guide/qna',
} as const;

/** 안내 페이지 열기 (params: studentName · programTitle · sid · from) */
export function openGuide(programId: string, section: GuideSection, params: Record<string, string> = {}) {
  router.push({ pathname: GUIDE_PATHNAMES[section], params: { ...params, programId } });
}

type Params = {
  programId: string;
  studentName?: string;
  programTitle?: string;
  sid?: string;
  from?: string;
};

export interface GuideContext {
  program: Program;
  programId: string;
  /** 회차 화면 등으로 넘길 값 (from 제외) */
  passParams: Record<string, string>;
}

export function GuideScreen({
  section,
  children,
}: {
  section: GuideSection;
  children: (ctx: GuideContext) => React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<Params>();
  const { programId, studentName, sid } = params;

  // TODO: Firestore 에서 programId 기준 조회
  const program = getDummyProgram(programId);
  const programTitle = params.programTitle ?? program.title;
  const fromHome = params.from === 'home';
  const backLabel = fromHome ? '홈' : isUpcomingProgram(program) ? '프로그램 안내' : '프로그램';
  const info = guideSection(section);

  const passParams: Record<string, string> = {
    ...(studentName ? { studentName } : {}),
    ...(params.programTitle ? { programTitle: params.programTitle } : {}),
    ...(sid ? { sid } : {}),
  };

  function goBack() {
    if (router.canGoBack()) router.back();
    else if (fromHome) router.replace('/main');
    else router.replace({ pathname: '/main/program/[programId]', params: { programId, ...passParams } });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={8} accessibilityRole="button">
          <Text style={styles.backText}>← {backLabel}</Text>
        </TouchableOpacity>
        <Text style={styles.headerSub} numberOfLines={2}>
          {programTitle}
        </Text>
        <Text style={styles.headerTitle} accessibilityRole="header">
          {info.icon} {info.label}
        </Text>
      </View>

      <View style={styles.body}>{children({ program, programId, passParams })}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  header: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 8 },
  backText: { fontSize: 16, fontWeight: '500', color: '#dbeafe' },
  headerSub: { marginTop: 8, fontSize: 15, lineHeight: 22, color: '#dbeafe' },
  headerTitle: { marginTop: 4, fontSize: 24, lineHeight: 32, fontWeight: '800', color: '#ffffff' },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
});
