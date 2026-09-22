/**
 * 메인 탭 레이아웃 — 3개 탭 (심플 학부모 뷰)
 * 홈 / 알림 / 내 정보
 *
 * 프로그램·안내·이력·FAQ 등 나머지 화면은 탭 위에 쌓이는 Stack 화면이다 (app/main/_layout.tsx).
 * → "← 홈"·뒤로가기가 항상 들어온 화면으로 돌아가고, 예전 화면이 탭 안에 남지 않는다.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { C } from '../../../lib/theme';

type IconName = 'home' | 'bell' | 'user';
const ICON_BOX_H = 58;

/** 선 아이콘(잉크) + 선택된 탭 위에 짧은 골드 선 — 이모지는 쓰지 않는다 (웹 components/ui/TabBar.tsx 와 같은 모양) */
function TabIcon({ name, label, focused }: { name: IconName; label: string; focused: boolean }) {
  return (
    <View style={styles.tabIconWrap}>
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
      <Feather name={name} size={23} color={focused ? C.gold : C.faint} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function MainTabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : 0);
  const tabBarHeight = 64 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarStyle: {
          height: tabBarHeight,
          borderTopWidth: 1,
          borderTopColor: C.line,
          backgroundColor: C.bg,
          paddingBottom: bottomPad,
          paddingTop: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: false,
        // 아이콘 칸을 탭 높이만큼 키워서 골드 선이 탭 바 맨 위에 딱 붙게 (기본 안쪽 여백 5 상쇄)
        tabBarIconStyle: { width: 88, height: ICON_BOX_H, marginTop: -5 },
      }}
    >
      {/* 홈: 모든 정보의 허브 */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarAccessibilityLabel: '홈',
          tabBarIcon: ({ focused }) => <TabIcon name="home" label="홈" focused={focused} />,
        }}
      />

      {/* 알림/공지 */}
      <Tabs.Screen
        name="notification"
        options={{
          tabBarAccessibilityLabel: '알림',
          tabBarIcon: ({ focused }) => <TabIcon name="bell" label="알림" focused={focused} />,
        }}
      />

      {/* 내 정보 */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarAccessibilityLabel: '내 정보',
          tabBarIcon: ({ focused }) => <TabIcon name="user" label="내 정보" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
    width: 88,
    height: ICON_BOX_H,
  },
  indicator: { width: 32, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, marginBottom: 7 },
  indicatorActive: { backgroundColor: C.gold },
  tabLabel: {
    fontSize: 14,
    color: C.sub,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: C.gold,
    fontWeight: '700',
  },
});
