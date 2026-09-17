/**
 * 회차 화면 — 프로그램 Q&A 탭
 * 이 회차에 대한 질문 + 모든 회차 공통 질문 (눌러서 펼치기), 아래에 챗봇·전화 문의
 */

import React, { useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { router } from 'expo-router';
import type { Session } from '../../../data/dummyProgram';
import { COMMON_SESSION_QNA } from '../../../data/programView';
import { CALL_CENTER_PHONE, CALL_CENTER_TEL } from '../../../lib/contact';
import { Body, Card, PanelTitle } from './parts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

async function callCenter() {
  try {
    if (await Linking.canOpenURL(CALL_CENTER_TEL)) await Linking.openURL(CALL_CENTER_TEL);
    else Alert.alert('전화 문의', `${CALL_CENTER_PHONE}\n평일 09:00~18:00`);
  } catch {
    Alert.alert('전화 문의', `${CALL_CENTER_PHONE}\n평일 09:00~18:00`);
  }
}

export function QnaPanel({ session }: { session: Session }) {
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

      <Card title="더 궁금한 점이 있으신가요?" icon="🙋">
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/main/faq', params: { tab: 'chatbot', from: 'session' } })}
          >
            <Text style={styles.btnPrimaryText}>🤖 챗봇에게 묻기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} activeOpacity={0.85} onPress={() => void callCenter()}>
            <Text style={styles.btnGhostText}>📞 전화 문의</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hours}>{CALL_CENTER_PHONE} · 평일 09:00~18:00</Text>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  qMark: { fontSize: 17, fontWeight: '800', color: '#1d4ed8' },
  qText: { flex: 1, fontSize: 17, lineHeight: 25, fontWeight: '600', color: '#111827' },
  chevron: { fontSize: 18, color: '#6b7280' },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  aRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  aMark: { fontSize: 17, fontWeight: '800', color: '#15803d' },
  aBox: { flex: 1, borderRadius: 16, backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingVertical: 12 },
  aText: { fontSize: 16, lineHeight: 25, color: '#1f2937' },
  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#1d4ed8' },
  btnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  btnGhost: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  btnGhostText: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  hours: { marginTop: 12, textAlign: 'center', fontSize: 15, color: '#4b5563' },
});
