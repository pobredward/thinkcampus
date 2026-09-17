/**
 * 메인 탭 레이아웃 — 3개 탭 (심플 학부모 뷰)
 * 홈 / 알림 / 내 정보
 *
 * 프로그램·출결·리포트는 홈에서 프로그램 카드를 눌러
 * Stack으로 진입하는 방식으로 변경됨
 *
 * backBehavior="history": 회차 Q&A → FAQ(챗봇) 에서 뒤로가기 하면 홈이 아니라 보던 회차로 돌아간다.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({
  symbol,
  label,
  focused,
}: {
  symbol: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Text style={styles.tabSymbol}>{symbol}</Text>
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
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: tabBarHeight,
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          backgroundColor: '#ffffff',
          paddingBottom: bottomPad,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      {/* 홈: 모든 정보의 허브 */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="🏠" label="홈" focused={focused} />
          ),
        }}
      />

      {/* 알림/공지 */}
      <Tabs.Screen
        name="notification"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="🔔" label="알림" focused={focused} />
          ),
        }}
      />

      {/* 내 정보 */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon symbol="👤" label="내 정보" focused={focused} />
          ),
        }}
      />

      {/* 아래 화면들은 탭바에 표시하지 않음 */}
      <Tabs.Screen name="program" options={{ href: null }} />
      <Tabs.Screen name="attendance" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
      <Tabs.Screen name="faq" options={{ href: null }} />
      <Tabs.Screen name="report_detail" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 44,
  },
  tabIconWrapActive: {
    backgroundColor: '#eff6ff',
  },
  tabSymbol: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
