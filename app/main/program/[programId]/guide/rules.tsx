/**
 * 프로그램 안내 — 수업 규정·지침 (프로그램에 규정이 없으면 기본 규정 — data/programGuide.ts)
 * 상단 경로: 홈 › 프로그램 › 수업 규정·지침 (웹 app/main/program/[programId]/guide/rules/page.tsx)
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GuideScreen } from '../../../../../components/program/GuideScreen';
import { Body } from '../../../../../components/program/session/parts';
import type { Program } from '../../../../../data/dummyProgram';
import { programRules } from '../../../../../data/programGuide';

export default function GuideRulesScreen() {
  return <GuideScreen section="rules">{({ program }) => <RulesSection program={program} />}</GuideScreen>;
}

function RulesSection({ program }: { program: Program }) {
  const rules = programRules(program);
  return (
    <>
      <View style={styles.warnBox}>
        <Body style={styles.warnText}>
          <Text style={{ fontWeight: '800' }}>반드시 지켜 주세요.</Text> 지키지 않으면 수강이 취소되거나 수료증이
          발급되지 않을 수 있어요.
        </Body>
      </View>
      {rules.map((r, i) => (
        <View key={i} style={[styles.ruleCard, r.important && styles.ruleCardImportant]}>
          <View style={styles.ruleHead}>
            {r.important && (
              <View style={styles.mustBadge}>
                <Text style={styles.mustText}>필수</Text>
              </View>
            )}
            <Text
              style={[styles.ruleTitle, r.important && { color: '#f27d78' }]}
              accessibilityRole="header"
              lineBreakStrategyIOS="hangul-word"
            >
              {r.title}
            </Text>
          </View>
          <Body style={styles.ruleBody}>{r.body}</Body>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  warnBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4a2326',
    backgroundColor: '#2a1719',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  warnText: { fontSize: 17, lineHeight: 26, color: '#f27d78' },
  ruleCard: { backgroundColor: '#161a22', borderRadius: 20, borderWidth: 1, borderColor: '#262b36', padding: 20 },
  ruleCardImportant: { borderColor: '#4a2326' },
  ruleHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  mustBadge: { borderRadius: 6, backgroundColor: '#f27d78', paddingHorizontal: 8, paddingVertical: 1 },
  mustText: { fontSize: 14, fontWeight: '700', color: '#f2f2f0' },
  ruleTitle: { flexShrink: 1, fontSize: 18, lineHeight: 26, fontWeight: '800', color: '#f2f2f0' },
  ruleBody: { marginTop: 8, fontSize: 16, lineHeight: 25, color: '#d4d7dd' },
});
