/**
 * "더 궁금한 점이 있으신가요?" — 챗봇 버튼 하나
 * 전화번호는 여기 두지 않는다. 챗봇으로 해결되지 않을 때 챗봇이 상담 전화를 안내한다.
 * (회차 Q&A 탭 · 자주 묻는 질문 안내 페이지에서 사용 — 웹은 같은 모양을 각 파일에 둔다)
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router, type Href } from 'expo-router';
import { C } from '../../lib/theme';
import { Card } from './session/parts';

/** href: lib/crumbs 의 faqHref — 들어온 곳(회차·자주 묻는 질문)이 고객 지원 화면의 상단 경로에 남는다 */
export function AskChatbot({ href }: { href: Href }) {
  return (
    <Card title="더 궁금한 점이 있으신가요?">
      <TouchableOpacity
        style={styles.btn}
        activeOpacity={0.85}
        accessibilityRole="button"
        onPress={() => router.push(href)}
      >
        <Text style={styles.btnText}>챗봇에게 물어보기</Text>
      </TouchableOpacity>
      <Text style={styles.hint} lineBreakStrategyIOS="hangul-word">
        챗봇으로 해결되지 않으면 상담 전화번호를 안내해 드려요.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: 16, backgroundColor: C.gold, paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '700', color: C.onGold },
  hint: { marginTop: 12, textAlign: 'center', fontSize: 15, lineHeight: 22, color: C.sub },
});
