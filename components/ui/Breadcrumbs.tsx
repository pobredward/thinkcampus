/**
 * 상단 경로 — "지금 어디에 있는지" 한 줄로 보여 주고, 앞 단계를 누르면 그 화면으로 돌아간다.
 *   홈 › 토요 창의융합 › 3회차
 *
 * - 앞 단계(링크): 보조 글자색, 누르면 쌓인 화면 중 그 화면까지 닫고 돌아간다(router.dismissTo).
 *   쌓인 화면에 없으면(알림·링크로 바로 들어온 경우) 지금 화면을 그 화면으로 바꾼다.
 * - 지금 화면: 골드 · 굵게 · 누를 수 없음
 * - 한 줄에 다 안 들어가면 옆으로 밀 수 있고, 처음엔 끝(지금 화면)이 보이도록 맞춘다
 * - 누르는 영역은 높이 44 (학부모용 최소 터치 크기)
 * - trailing: 같은 줄 오른쪽 끝에 둘 것 (예: 홈의 자녀 전환 버튼) — 경로(navigation) 바깥에 둔다
 * (웹 web/src/components/ui/Breadcrumbs.tsx 와 같은 모양)
 */

import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router, type Href } from 'expo-router';
import { C } from '../../lib/theme';

export interface Crumb {
  label: string;
  /** 누르면 갈 곳 — 마지막(지금 화면)은 비워 둔다 */
  href?: Href;
}

/** 헤더 좌우 여백(20)만큼 밖으로 넓혀 옆으로 밀 때 화면 끝까지 쓰고, 글자 줄은 헤더 글자와 맞춘다 */
const EDGE = 20;

export function Breadcrumbs({
  items,
  style,
  trailing,
}: {
  items: Crumb[];
  style?: StyleProp<ViewStyle>;
  trailing?: React.ReactNode;
}) {
  const scroller = useRef<ScrollView>(null);

  return (
    <View style={[styles.wrap, style]}>
      <View role="navigation" aria-label="현재 위치" style={styles.nav}>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
        >
          {items.map((c, i) => {
            const last = i === items.length - 1;
            const isHome = i === 0 && c.label === '홈';
            const href = c.href;
            return (
              <View key={`${i}-${c.label}`} style={styles.item}>
                {last || !href ? (
                  <View
                    style={styles.crumb}
                    accessible
                    accessibilityLabel={last ? `지금 화면, ${c.label}` : c.label}
                    accessibilityState={last ? { selected: true } : undefined}
                  >
                    {isHome && <Feather name="home" size={17} color={last ? C.gold : C.sub} />}
                    <Text numberOfLines={1} style={[styles.text, last ? styles.current : styles.ancestor, styles.currentMax]}>
                      {c.label}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => router.dismissTo(href)}
                    activeOpacity={0.55}
                    accessibilityRole="link"
                    accessibilityLabel={c.label}
                    accessibilityHint={`${c.label} 화면으로 돌아가요`}
                    style={styles.crumb}
                  >
                    {isHome && <Feather name="home" size={17} color={C.sub} />}
                    <Text numberOfLines={1} style={[styles.text, styles.ancestor, styles.ancestorMax]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                )}
                {!last && <Feather name="chevron-right" size={14} color={C.faint} style={styles.sep} />}
              </View>
            );
          })}
        </ScrollView>
      </View>
      {!!trailing && <View style={styles.trailing}>{trailing}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: -EDGE, flexDirection: 'row', alignItems: 'center' },
  nav: { flex: 1, minWidth: 0, height: 44 },
  trailing: { flexShrink: 0, paddingLeft: 8, paddingRight: EDGE },
  row: { flexGrow: 1, alignItems: 'center', paddingHorizontal: EDGE - 4 },
  item: { flexDirection: 'row', alignItems: 'center' },
  crumb: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  text: { fontSize: 15, lineHeight: 20 },
  ancestor: { fontWeight: '500', color: C.sub },
  ancestorMax: { maxWidth: 150 },
  current: { fontWeight: '700', color: C.gold },
  currentMax: { maxWidth: 200 },
  sep: { marginHorizontal: 3 },
});
