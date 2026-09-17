/**
 * 프로그램 안내 — 자주 묻는 질문 (프로그램 질문 먼저, 그다음 기본 질문: 준비물 · 지각·결석 · 모임·픽업 · 간식 · 점심)
 * 질문을 누르면 답이 펼쳐진다 (웹 app/main/program/[programId]/guide/qna/page.tsx)
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
import { GuideScreen } from '../../../../../components/program/GuideScreen';
import { Body, Card } from '../../../../../components/program/session/parts';
import type { Program } from '../../../../../data/dummyProgram';
import { programFaq } from '../../../../../data/programGuide';
import { CALL_CENTER_PHONE, CALL_CENTER_TEL } from '../../../../../lib/contact';

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

export default function GuideQnaScreen() {
  return <GuideScreen section="qna">{({ program }) => <QnaSection program={program} />}</GuideScreen>;
}

function QnaSection({ program }: { program: Program }) {
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

      <Card title="더 궁금한 점이 있으신가요?" icon="🙋">
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/main/faq', params: { tab: 'chatbot', from: 'program' } })}
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
  qnaList: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  divider: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  qMark: { fontSize: 17, fontWeight: '800', color: '#1d4ed8' },
  topic: {
    alignSelf: 'flex-start',
    marginBottom: 4,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  topicText: { fontSize: 14, fontWeight: '600', color: '#4b5563' },
  qText: { fontSize: 17, lineHeight: 25, fontWeight: '600', color: '#111827' },
  qChevron: { fontSize: 18, color: '#6b7280' },
  qChevronOpen: { transform: [{ rotate: '180deg' }] },
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
