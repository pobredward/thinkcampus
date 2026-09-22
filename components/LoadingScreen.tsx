/**
 * 앱 초기 로딩 화면 — Auth 상태 확인 중 표시
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // 로고 페이드인 + 스케일
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // 점 로딩 애니메이션 (순차 반복)
    const dotSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        ]),
      ])
    );
    dotSequence.start();

    return () => dotSequence.stop();
  }, []);

  return (
    <View style={styles.container}>
      {/* 로고 영역 */}
      <Animated.View
        style={[
          styles.logoWrap,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* 심볼 아이콘 */}
        <View style={styles.iconBg}>
          <Text style={styles.iconText}>TC</Text>
        </View>

        <Text style={styles.appName}>ThinkCampus</Text>
        <Text style={styles.tagline}>학부모 전용 서비스</Text>
      </Animated.View>

      {/* 로딩 점 */}
      <Animated.View style={[styles.dotsRow, { opacity: fadeAnim }]}>
        {[dot1, dot2, dot3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { opacity: anim }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161a22',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  logoWrap: {
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#d4b06a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconText: {
    color: '#0c0e13',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f2f2f0',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#9aa0ab',
    fontWeight: '400',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d4b06a',
  },
});
