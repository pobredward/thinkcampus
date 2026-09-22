/**
 * 회차 화면 — 프로그램 Q&A 탭
 * 이 회차에 대한 질문 + 모든 회차 공통 질문 (눌러서 펼치기), 아래에 챗봇 (전화는 챗봇에서 해결되지 않을 때 안내)
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
import type { Session } from '../../../data/dummyProgram';
import { COMMON_SESSION_QNA } from '../../../data/programView';
import { C } from '../../../lib/theme';
import { AskChatbot } from '../AskChatbot';
import { Body, PanelTitle } from './parts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function QnaPanel({ session, chatbotHref }: { session: Session; chatbotHref: Href }) {
  const items = [...(session.qna ?? []), ...COMMON_SESSION_QNA];
  const [open, setOpen] = useState<number | null>(null);

  function toggle(i: number) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === i ? null : i));
  }

  return (
    <>
      <PanelTitle>프로그램 Q&amp;A</PanelTitle>
      <View style={styles.list}>
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
                <Body style={styles.qText}>{it.q}</Body>
                <Text style={[styles.chevron, expanded && styles.chevronOpen]}>⌄</Text>
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
  list: {
    backgroundColor: '#161a22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262b36',
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: '#262b36' },
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  qMark: { fontSize: 17, fontWeight: '800', color: C.gold },
  qText: { flex: 1, fontSize: 17, lineHeight: 25, fontWeight: '600', color: '#f2f2f0' },
  chevron: { fontSize: 18, color: '#9aa0ab' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  aRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  aMark: { fontSize: 17, fontWeight: '800', color: '#9aa0ab' },
  aBox: { flex: 1, borderRadius: 16, backgroundColor: '#1e232d', paddingHorizontal: 16, paddingVertical: 12 },
  aText: { fontSize: 16, lineHeight: 25, color: '#d4d7dd' },
});
