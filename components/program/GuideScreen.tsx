/**
 * 프로그램 안내 페이지 공통 틀 — 헤더(상단 경로 홈 › 프로그램 › 안내 · 제목 · 필독 배지) + 본문
 * (웹 web/src/components/program/GuidePage.tsx)
 *
 * 안내 페이지는 서로 독립이다: app/main/program/[programId]/guide/{schedule,purpose,notices,rules,qna}.tsx
 * 새 안내를 추가할 때 → data/programGuide.ts 에 항목 추가 + 아래 GUIDE_PATHNAMES 에 한 줄 + 페이지 파일 하나.
 *
 * params: programId · studentName · programTitle · sid · via
 */

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Program } from '../../data/dummyProgram';
import { guideSection, type GuideSection } from '../../data/programGuide';
import { getDummyProgram } from '../../data/programView';
import { guideCrumbs, programParams } from '../../lib/crumbs';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { C } from '../../lib/theme';

const GUIDE_PATHNAMES = {
  schedule: '/main/program/[programId]/guide/schedule',
  purpose: '/main/program/[programId]/guide/purpose',
  notices: '/main/program/[programId]/guide/notices',
  rules: '/main/program/[programId]/guide/rules',
  qna: '/main/program/[programId]/guide/qna',
} as const;

/** 안내 페이지 열기 (params: studentName · programTitle · sid · via) */
export function openGuide(programId: string, section: GuideSection, params: Record<string, string> = {}) {
  router.push({ pathname: GUIDE_PATHNAMES[section], params: { ...params, programId } });
}

type Params = {
  programId: string;
  studentName?: string;
  programTitle?: string;
  sid?: string;
  via?: string;
};

export interface GuideContext {
  program: Program;
  programId: string;
  /** 회차 화면 등으로 넘길 값 (studentName · programTitle · sid · via) */
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
  const { programId } = params;

  // TODO: Firestore 에서 programId 기준 조회
  const program = getDummyProgram(programId);
  const programTitle = params.programTitle ?? program.title;
  const info = guideSection(section);

  const passParams = programParams(params);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Breadcrumbs items={guideCrumbs({ programId, programTitle, params, section })} />
        <View style={styles.titleRow}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {info.label}
          </Text>
          {!!info.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{info.badge}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.body}>{children({ program, programId, passParams })}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.paper },
  content: { paddingBottom: 40 },
  header: { backgroundColor: C.bg, paddingHorizontal: 20, paddingBottom: 20 },
  titleRow: { marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 24, lineHeight: 33, fontWeight: '800', color: C.white, letterSpacing: -0.2 },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.goldDim,
    backgroundColor: C.goldLight,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: C.goldSoft },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
});
