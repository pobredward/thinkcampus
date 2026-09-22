/**
 * 프로그램 안내 — 자주 묻는 질문 (프로그램 질문 먼저, 그다음 기본 질문: 준비물 · 지각·결석 · 모임·픽업 · 간식 · 점심)
 * 질문을 누르면 답이 펼쳐진다 (웹 app/main/program/[programId]/guide/qna/page.tsx)
 */

import React, { useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import type { Href } from 'expo-router';
import { AskChatbot } from '../../../../../components/program/AskChatbot';
import { GuideScreen } from '../../../../../components/program/GuideScreen';
import { Body } from '../../../../../components/program/session/parts';
import type { Program } from '../../../../../data/dummyProgram';
import { programFaq } from '../../../../../data/programGuide';
import { faqHref } from '../../../../../lib/crumbs';
import { C } from '../../../../../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function GuideQnaScreen() {
  return (
    <GuideScreen section="qna">
      {({ program, programId, passParams }) => (
        <QnaSection program={program} chatbotHref={faqHref({ from: 'program', programId, params: passParams })} />
      )}
    </GuideScreen>
  );
}

function QnaSection({ program, chatbotHref }: { program: Program; chatbotHref: Href }) {
  const items = programFaq(program);
  const [open, setOpen] = useState<number | null>(null);

  function toggle(i: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === i ? null : i));
  }

  return (
    <>
      <View style={styles.qnaList} accessibilityLabel="자주 묻는 질문 목록">
        {items.map((it, i) => {
          const expanded = open === i;
          return (
            <View key={i} style={i > 0 ? styles.divider : undefined}>
              <TouchableOpacity
                onPress={() => toggle(i)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                style={styles.qRow}
              >
                <Text style={styles.qMark}>Q</Text>
                <View style={{ flex: 1 }}>
                  <View style={styles.topic}>
                    <Text style={styles.topicText}>{it.topic}</Text>
                  </View>
                  <Body style={styles.qText}>{it.q}</Body>
                </View>
                <Text style={[styles.qChevron, expanded && styles.qChevronOpen]}>⌄</Text>
              </TouchableOpacity>
              {expanded && (
                <View style={styles.aRow}>
                  <Text style={styles.aMark}>A</Text>
                  <View style={styles.aBox}>
                    <Body style={styles.aText}>{it.a}</Body>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <AskChatbot href={chatbotHref} />
    </>
  );
}

const styles = StyleSheet.create({
  qnaList: {
    backgroundColor: '#161a22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262b36',
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: '#262b36' },
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  qMark: { fontSize: 17, fontWeight: '800', color: C.gold },
  topic: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: '#1e232d',
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  topicText: { fontSize: 14, fontWeight: '600', color: '#9aa0ab' },
  qText: { fontSize: 17, lineHeight: 25, fontWeight: '600', color: '#f2f2f0' },
  qChevron: { fontSize: 18, color: '#9aa0ab' },
  qChevronOpen: { transform: [{ rotate: '180deg' }] },
  aRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  aMark: { fontSize: 17, fontWeight: '800', color: '#9aa0ab' },
  aBox: { flex: 1, borderRadius: 16, backgroundColor: '#1e232d', paddingHorizontal: 16, paddingVertical: 12 },
  aText: { fontSize: 16, lineHeight: 25, color: '#d4d7dd' },
});
