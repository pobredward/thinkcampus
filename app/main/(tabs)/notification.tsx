/**
 * 알림 / 공지사항 화면
 * - 수업 변경, 출결 알림, 캠프 공지 등
 * - 나중에 Firestore notifications 컬렉션으로 교체 예정
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NotifType = 'attendance' | 'notice' | 'report' | 'schedule';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  date: string;
  isRead: boolean;
}

// ── 더미 알림 데이터 ─────────────────────────────────────
const DUMMY_NOTIFICATIONS: Notification[] = [
  {
    id: 'n-002',
    type: 'notice',
    title: '다음 수업 안내',
    body: '4회차 사고·창의력 디베이트 수업이 2026.10.17 (토) 오전 10:00~12:00 예정대로 진행됩니다. 강남구 청소년수련관 3층 301호.',
    date: '2026.10.14',
    isRead: false,
  },
  {
    id: 'n-003',
    type: 'schedule',
    title: '수업 준비물 안내',
    body: '다음 수업(10/17 사고·창의력 디베이트)에 필기도구와 포스트잇을 지참해주세요.',
    date: '2026.10.14',
    isRead: false,
  },
  {
    id: 'n-004',
    type: 'attendance',
    title: '지각 알림',
    body: '김민준 학생이 3회차(한국사 인문학) 수업에 18분 지각하였습니다.',
    date: '2026.10.03',
    isRead: false,
  },
  {
    id: 'n-001',
    type: 'attendance',
    title: '출결 업데이트',
    body: '김민준 학생의 2회차(세계사 인문학) 출석이 확인되었습니다.',
    date: '2026.09.19',
    isRead: true,
  },
  {
    id: 'n-006',
    type: 'report',
    title: '리포트 업로드 예정',
    body: '각 회차 리포트는 수업 당일 저녁에, 종합 리포트는 전체 프로그램 종료(2026.11.14) 후 영업일 기준 3~5일 내 업로드됩니다.',
    date: '2026.09.06',
    isRead: true,
  },
  {
    id: 'n-007',
    type: 'notice',
    title: 'ThinkCampus 앱 서비스 시작',
    body: '학부모님께 자녀의 출결 및 수업 피드백을 실시간으로 확인하실 수 있는 앱 서비스가 시작되었습니다.',
    date: '2026.09.01',
    isRead: true,
  },
];

function getTypeInfo(type: NotifType): { label: string } {
  switch (type) {
    case 'attendance':
      return { label: '출결' };
    case 'notice':
      return { label: '공지' };
    case 'report':
      return { label: '리포트' };
    case 'schedule':
      return { label: '일정' };
  }
}

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0c0e13' }}>
      {/* 고정 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>알림</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>모두 읽음 처리</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      >
        {notifications.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>새 알림이 없습니다</Text>
          </View>
        )}

        {notifications.map((notif) => {
          const info = getTypeInfo(notif.type);
          return (
            <TouchableOpacity
              key={notif.id}
              style={[styles.card, !notif.isRead && styles.cardUnread]}
              onPress={() => markRead(notif.id)}
              activeOpacity={0.8}
            >
              {/* 미읽음 점 */}
              {!notif.isRead && <View style={styles.unreadDot} />}

              {/* 상단 행 */}
              <View style={styles.cardTop}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeLabel}>{info.label}</Text>
                </View>
                <Text style={styles.cardDate}>{notif.date}</Text>
              </View>

              {/* 제목 + 본문 */}
              <Text style={[styles.cardTitle, !notif.isRead && styles.cardTitleUnread]}>
                {notif.title}
              </Text>
              <Text style={styles.cardBody}>{notif.body}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#0c0e13',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#262b36',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f2f2f0' },
  unreadBadge: {
    backgroundColor: '#d4b06a',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: { fontSize: 14, color: '#0c0e13', fontWeight: '700' },
  markAllBtn: { alignSelf: 'flex-start' },
  markAllText: { fontSize: 15, color: '#d4b06a', fontWeight: '500' },

  content: { paddingTop: 12, paddingHorizontal: 16 },

  emptyWrap: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 16, color: '#9aa0ab' },

  card: {
    backgroundColor: '#161a22',
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262b36',
    position: 'relative',
  },
  cardUnread: {
    borderColor: '#4a3e22',
    backgroundColor: '#161a22',
  },
  unreadDot: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d4b06a',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeBadge: {
    borderRadius: 6,
    backgroundColor: '#1e232d',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeLabel: { fontSize: 14, fontWeight: '700', color: '#d4d7dd' },
  cardDate: { paddingRight: 16, fontSize: 14, color: '#9aa0ab' },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d4d7dd',
    marginBottom: 4,
  },
  cardTitleUnread: {
    color: '#f2f2f0',
    fontWeight: '700',
  },
  cardBody: {
    fontSize: 15,
    color: '#9aa0ab',
    lineHeight: 23,
  },
});
