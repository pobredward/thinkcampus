/**
 * 출결·피드백 탭
 * - 자녀 전환 탭 (2명 이상)
 * - 출결 요약 카드 (출석률·평균참여도·과제완료율)
 * - 회차별 어코디언 리스트 (출결 상태 + 강사 피드백 + 하이라이트)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ALL_ATTENDANCE,
  calcSummary,
  getStatusLabel,
  getStatusColor,
  getStatusBg,
  getParticipationLabel,
  getParticipationColor,
  type SessionRecord,
  type AttendanceSummary,
} from '../../data/dummyAttendance';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── 메인 컴포넌트 ──────────────────────────────────────────

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const students = ALL_ATTENDANCE;
  const student = students[selectedIdx];
  const summary = calcSummary(student);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Firestore에서 출결 데이터 재조회
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  function toggleSession(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0c0e13' }}>

      {/* ── 고정 헤더 ── */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>출결 · 피드백</Text>

        {/* 자녀 전환 탭 (2명 이상일 때만) */}
        {students.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.childTabScroll}
            contentContainerStyle={styles.childTabContent}
          >
            {students.map((s, i) => {
              const sm = calcSummary(s);
              const isActive = selectedIdx === i;
              return (
                <TouchableOpacity
                  key={s.studentId}
                  style={[styles.childTab, isActive && styles.childTabActive]}
                  onPress={() => {
                    setSelectedIdx(i);
                    setExpandedId(null);
                  }}
                >
                  <View style={[styles.childAvatar, isActive && styles.childAvatarActive]}>
                    <Text style={[styles.childAvatarText, isActive && { color: '#f2f2f0' }]}>
                      {s.studentName.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={[styles.childName, isActive && styles.childNameActive]}>
                      {s.studentName}
                    </Text>
                    <Text style={styles.childRate}>출석 {sm.attendanceRate}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4b06a" />
        }
      >
        {/* ── 요약 카드 ── */}
        <SummaryCard student={student} summary={summary} />

        {/* ── 출결 범례 ── */}
        <View style={styles.legendRow}>
          {(['present', 'late', 'absent', 'upcoming'] as const).map((s) => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getStatusColor(s) }]} />
              <Text style={styles.legendText}>{getStatusLabel(s)}</Text>
            </View>
          ))}
        </View>

        {/* ── 회차별 어코디언 ── */}
        <Text style={styles.sectionTitle}>회차별 상세</Text>
        <Text style={styles.sectionHint}>회차를 탭하면 피드백을 펼칩니다.</Text>

        {student.sessions.map((sess) => (
          <SessionCard
            key={sess.sessionId}
            sess={sess}
            expanded={expandedId === sess.sessionId}
            onToggle={() => toggleSession(sess.sessionId)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ── 요약 카드 ─────────────────────────────────────────────

function SummaryCard({
  student,
  summary,
}: {
  student: (typeof ALL_ATTENDANCE)[number];
  summary: AttendanceSummary;
}) {
  // 미니 달력 도트 (session status)
  const dots = student.sessions.map((s) => ({
    id: s.sessionId,
    num: s.sessionNumber,
    status: s.status,
  }));

  return (
    <View style={styles.summaryCard}>
      {/* 학생 정보 행 */}
      <View style={styles.summaryTop}>
        <View style={styles.summaryAvatar}>
          <Text style={styles.summaryAvatarText}>{student.studentName.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryName}>{student.studentName}</Text>
          <Text style={styles.summaryCampus}>{student.campusName}</Text>
          <Text style={styles.summaryPeriod}>{student.campPeriod}</Text>
        </View>
        {/* 출석률 큰 숫자 */}
        <View style={styles.attendanceRateBox}>
          <Text style={[styles.attendanceRateNum, {
            color: summary.attendanceRate >= 90 ? '#141a24'
              : summary.attendanceRate >= 70 ? '#d97706' : '#dc2626',
          }]}>
            {summary.attendanceRate}%
          </Text>
          <Text style={styles.attendanceRateLabel}>출석률</Text>
        </View>
      </View>

      {/* 출결 도트 캘린더 */}
      <View style={styles.dotRow}>
        {dots.map((d) => (
          <View key={d.id} style={styles.dotItem}>
            <View style={[styles.dot, { backgroundColor: getStatusColor(d.status) },
              d.status === 'upcoming' && styles.dotUpcoming]}>
              {d.status === 'upcoming' && (
                <Text style={styles.dotNum}>{d.num}</Text>
              )}
            </View>
            {d.status !== 'upcoming' && (
              <Text style={[styles.dotLabel, { color: getStatusColor(d.status) }]}>
                {d.num}
              </Text>
            )}
            {d.status === 'upcoming' && (
              <Text style={[styles.dotLabel, { color: '#9aa0ab' }]}>{d.num}</Text>
            )}
          </View>
        ))}
      </View>

      {/* 3개 지표 */}
      <View style={styles.metricsRow}>
        <MetricBox
          label="출결 현황"
          value={`${summary.present + summary.late}/${summary.doneCount}`}
          sub={summary.absent > 0 ? `결석 ${summary.absent}회` : '결석 없음'}
          subColor={summary.absent > 0 ? '#dc2626' : '#141a24'}
        />
        <View style={styles.metricDivider} />
        <MetricBox
          label="평균 참여도"
          value={`${summary.avgParticipation}점`}
          sub={getParticipationLabel(summary.avgParticipation)}
          subColor={getParticipationColor(summary.avgParticipation)}
        />
        <View style={styles.metricDivider} />
        <MetricBox
          label="과제 완료율"
          value={`${summary.homeworkRate}%`}
          sub={summary.homeworkRate >= 80 ? '우수' : '개선 필요'}
          subColor={summary.homeworkRate >= 80 ? '#141a24' : '#d97706'}
        />
      </View>

      {/* 진행 현황 바 */}
      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>캠프 진행</Text>
          <Text style={styles.progressValue}>
            {summary.doneCount}/{student.totalSessions}회차 완료
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          {/* 출석 */}
          <View style={[styles.progressBarFill, {
            width: `${(summary.present / student.totalSessions) * 100}%`,
            backgroundColor: '#d4b06a',
          }]} />
          {/* 지각 */}
          <View style={[styles.progressBarFill, {
            width: `${(summary.late / student.totalSessions) * 100}%`,
            backgroundColor: '#f2a65a',
            marginLeft: 0,
          }]} />
          {/* 결석 */}
          <View style={[styles.progressBarFill, {
            width: `${(summary.absent / student.totalSessions) * 100}%`,
            backgroundColor: '#f27d78',
          }]} />
        </View>
      </View>
    </View>
  );
}

function MetricBox({
  label, value, sub, subColor,
}: {
  label: string; value: string; sub: string; subColor: string;
}) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={[styles.metricSub, { color: subColor }]}>{sub}</Text>
    </View>
  );
}

// ── 회차 카드 ─────────────────────────────────────────────

function SessionCard({
  sess,
  expanded,
  onToggle,
}: {
  sess: SessionRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusColor = getStatusColor(sess.status);
  const statusBg    = getStatusBg(sess.status);
  const isUpcoming  = sess.status === 'upcoming';

  return (
    <View style={[styles.sessionCard, isUpcoming && styles.sessionCardUpcoming]}>
      {/* 헤더 행 */}
      <TouchableOpacity
        style={styles.sessionHeader}
        onPress={isUpcoming ? undefined : onToggle}
        activeOpacity={isUpcoming ? 1 : 0.7}
      >
        {/* 회차 번호 */}
        <View style={[styles.sessionNumBox, { backgroundColor: statusBg }]}>
          <Text style={[styles.sessionNum, { color: statusColor }]}>{sess.sessionNumber}</Text>
        </View>

        {/* 아이콘 + 정보 */}
        <View style={styles.sessionInfo}>
          <View style={styles.sessionTitleRow}>
            <Text style={[styles.sessionTopic, isUpcoming && styles.sessionTopicMuted]}>
              {sess.topic}
            </Text>
          </View>
          <Text style={styles.sessionDate}>{sess.date} · {sess.instructorName}</Text>
        </View>

        {/* 오른쪽: 상태 뱃지 + 화살표 */}
        <View style={styles.sessionRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {getStatusLabel(sess.status)}
              {sess.status === 'late' && sess.lateMinutes ? ` +${sess.lateMinutes}분` : ''}
            </Text>
          </View>
          {!isUpcoming && (
            <Text style={[styles.chevron, expanded && styles.chevronOpen]}>›</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* 확장 영역 */}
      {!isUpcoming && expanded && (
        <View style={styles.sessionExpanded}>
          {/* 참여도 + 과제 */}
          <View style={styles.expandedMetaRow}>
            {sess.participationScore !== null && (
              <View style={styles.expandedMeta}>
                <Text style={styles.expandedMetaLabel}>참여도</Text>
                <View style={styles.participationBarBg}>
                  <View style={[styles.participationBarFill, {
                    width: `${sess.participationScore}%`,
                    backgroundColor: getParticipationColor(sess.participationScore),
                  }]} />
                </View>
                <Text style={[styles.participationScore, {
                  color: getParticipationColor(sess.participationScore),
                }]}>
                  {sess.participationScore}점 ({getParticipationLabel(sess.participationScore)})
                </Text>
              </View>
            )}
            {sess.homeworkDone !== null && (
              <View style={styles.hwChip}>
                <Text style={[styles.hwChipText, {
                  color: sess.homeworkDone ? '#141a24' : '#dc2626',
                }]}>
                  {sess.homeworkDone ? '✓ 과제 완료' : '✗ 과제 미제출'}
                </Text>
              </View>
            )}
          </View>

          {/* 강사 피드백 */}
          {sess.feedback && (
            <View style={styles.feedbackBox}>
              <View style={styles.feedbackLabelRow}>
                <Text style={styles.feedbackIcon}>💬</Text>
                <Text style={styles.feedbackLabel}>강사 피드백</Text>
              </View>
              <Text style={styles.feedbackText}>{sess.feedback}</Text>
            </View>
          )}

          {/* 잘한 점 */}
          {sess.highlights.length > 0 && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightLabel}>⭐ 잘한 점</Text>
              {sess.highlights.map((h, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletGreen} />
                  <Text style={styles.highlightText}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 개선 사항 */}
          {sess.improvements.length > 0 && (
            <View style={styles.improvementBox}>
              <Text style={styles.improvementLabel}>📈 개선 권장</Text>
              {sess.improvements.map((m, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletBlue} />
                  <Text style={styles.improvementText}>{m}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 예정 안내 */}
      {isUpcoming && (
        <View style={styles.upcomingNotice}>
          <Text style={styles.upcomingNoticeText}>
            수업 종료 후 피드백이 등록됩니다.
          </Text>
        </View>
      )}
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: '#0c0e13',
    borderBottomWidth: 1,
    borderBottomColor: '#262b36',
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f2f2f0',
    paddingBottom: 12,
  },

  // 자녀 탭
  childTabScroll: {},
  childTabContent: { gap: 4, paddingBottom: 0 },
  childTab: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  childTabActive: { borderBottomColor: '#d4b06a' },
  childAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#343a47', alignItems: 'center', justifyContent: 'center',
  },
  childAvatarActive: { backgroundColor: '#d4b06a' },
  childAvatarText: { fontSize: 14, fontWeight: '700', color: '#0c0e13' },
  childName: { fontSize: 16, color: '#9aa0ab', fontWeight: '500' },
  childNameActive: { color: '#d4b06a', fontWeight: '700' },
  childRate: { fontSize: 14, color: '#9aa0ab', marginTop: 1 },

  scrollContent: { paddingTop: 16 },

  // 요약 카드
  summaryCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#161a22', borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: '#262b36',
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  summaryAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1e232d', alignItems: 'center', justifyContent: 'center',
  },
  summaryAvatarText: { fontSize: 20, fontWeight: '700', color: '#d4b06a' },
  summaryName: { fontSize: 17, fontWeight: '700', color: '#f2f2f0' },
  summaryCampus: { fontSize: 14, color: '#9aa0ab', marginTop: 1 },
  summaryPeriod: { fontSize: 14, color: '#9aa0ab', marginTop: 1 },
  attendanceRateBox: { alignItems: 'center' },
  attendanceRateNum: { fontSize: 28, fontWeight: '900' },
  attendanceRateLabel: { fontSize: 14, color: '#9aa0ab', marginTop: 1 },

  // 도트 캘린더
  dotRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 16, paddingHorizontal: 4,
  },
  dotItem: { alignItems: 'center', gap: 3 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dotUpcoming: { backgroundColor: '#1e232d', borderWidth: 1.5, borderColor: '#343a47', borderStyle: 'dashed' },
  dotNum: { fontSize: 14, fontWeight: '700', color: '#9aa0ab' },
  dotLabel: { fontSize: 14, fontWeight: '600' },

  // 3개 지표
  metricsRow: {
    flexDirection: 'row', marginBottom: 14,
    backgroundColor: '#0c0e13', borderRadius: 12, padding: 12,
  },
  metricBox: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, backgroundColor: '#343a47', marginVertical: 4 },
  metricLabel: { fontSize: 14, color: '#9aa0ab', fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  metricValue: { fontSize: 20, fontWeight: '800', color: '#f2f2f0', marginBottom: 2 },
  metricSub: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // 진행 바
  progressSection: {},
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { fontSize: 14, color: '#9aa0ab' },
  progressValue: { fontSize: 14, color: '#d4d7dd', fontWeight: '600' },
  progressBarBg: {
    height: 8, backgroundColor: '#1e232d', borderRadius: 4,
    overflow: 'hidden', flexDirection: 'row',
  },
  progressBarFill: { height: 8 },

  // 범례
  legendRow: {
    flexDirection: 'row', gap: 14,
    paddingHorizontal: 20, marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 14, color: '#9aa0ab' },

  // 섹션 제목
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#f2f2f0',
    marginHorizontal: 20, marginBottom: 4,
  },
  sectionHint: {
    fontSize: 14, color: '#9aa0ab',
    marginHorizontal: 20, marginBottom: 10,
  },

  // 회차 카드
  sessionCard: {
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: '#161a22', borderRadius: 14,
    borderWidth: 1, borderColor: '#262b36', overflow: 'hidden',
  },
  sessionCardUpcoming: { backgroundColor: '#1e232d', borderColor: '#262b36' },
  sessionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13,
  },
  sessionNumBox: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  sessionNum: { fontSize: 16, fontWeight: '800' },
  sessionInfo: { flex: 1 },
  sessionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  sessionIcon: { fontSize: 16 },
  sessionTopic: { fontSize: 16, fontWeight: '600', color: '#f2f2f0', flex: 1 },
  sessionTopicMuted: { color: '#9aa0ab' },
  sessionDate: { fontSize: 14, color: '#9aa0ab' },
  sessionRight: { alignItems: 'flex-end', gap: 4 },
  statusBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 14, fontWeight: '700' },
  chevron: { fontSize: 20, color: '#9aa0ab' },
  chevronOpen: { transform: [{ rotate: '90deg' }], color: '#d4b06a' },

  // 확장 영역
  sessionExpanded: {
    borderTopWidth: 1, borderTopColor: '#262b36', padding: 14,
  },
  expandedMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  expandedMeta: { flex: 1 },
  expandedMetaLabel: { fontSize: 14, fontWeight: '600', color: '#9aa0ab', marginBottom: 4 },
  participationBarBg: {
    height: 6, backgroundColor: '#1e232d', borderRadius: 3,
    overflow: 'hidden', marginBottom: 3,
  },
  participationBarFill: { height: 6, borderRadius: 3 },
  participationScore: { fontSize: 14, fontWeight: '600' },
  hwChip: {
    backgroundColor: '#1e232d', borderRadius: 8,
    paddingHorizontal: 9, paddingVertical: 5,
    borderWidth: 1, borderColor: '#262b36',
  },
  hwChipText: { fontSize: 14, fontWeight: '700' },

  feedbackBox: {
    backgroundColor: '#0c0e13', borderRadius: 10, padding: 12, marginBottom: 10,
  },
  feedbackLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  feedbackIcon: { fontSize: 15 },
  feedbackLabel: { fontSize: 14, fontWeight: '700', color: '#d4d7dd' },
  feedbackText: { fontSize: 15, color: '#d4d7dd', lineHeight: 23 },

  highlightBox: {
    backgroundColor: '#1e232d', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#343a47',
  },
  highlightLabel: { fontSize: 14, fontWeight: '700', color: '#d4b06a', marginBottom: 7 },
  bulletRow: { flexDirection: 'row', gap: 7, marginBottom: 4, alignItems: 'flex-start' },
  bulletGreen: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: '#d4b06a', marginTop: 5,
  },
  highlightText: { flex: 1, fontSize: 14, color: '#d4b06a', lineHeight: 20 },

  improvementBox: {
    backgroundColor: '#1e232d', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#343a47',
  },
  improvementLabel: { fontSize: 14, fontWeight: '700', color: '#d4b06a', marginBottom: 7 },
  bulletBlue: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: '#7c8390', marginTop: 5,
  },
  improvementText: { flex: 1, fontSize: 14, color: '#d4b06a', lineHeight: 20 },

  upcomingNotice: {
    paddingHorizontal: 13, paddingBottom: 10,
  },
  upcomingNoticeText: { fontSize: 14, color: '#9aa0ab', fontStyle: 'italic' },
});
