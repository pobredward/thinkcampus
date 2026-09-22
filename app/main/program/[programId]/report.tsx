/**
 * 프로그램 종합 학습 리포트
 * 진입: 회차 목록 아래 [종합 리포트 보기] · 회차 리포트 탭 (모든 회차가 끝난 뒤에만 열림)
 * 상단 경로: 홈 › 프로그램 › 종합 리포트
 *
 * 해당 학생의 종합 리포트
 * - 종합 등급 & 총평
 * - 프로그램별 역량 평가
 * - PDF/공유 기능
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ProgramHeader } from '../../../../components/program/ProgramHeader';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '../../../../firebase';
import {
  DUMMY_REPORT,
  getGradeColor,
  getGradeBg,
  type StudentReport,
  type ProgramReport,
} from '../../../../data/dummyReport';
import { getDummyProgram } from '../../../../data/programView';
import { programCrumbs } from '../../../../lib/crumbs';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProgramReportScreen() {
  const params = useLocalSearchParams<{
    programId: string;
    studentName?: string;
    programTitle?: string;
    sid?: string;
    via?: string;
  }>();
  const { studentName, programId } = params;
  const programTitle = params.programTitle ?? getDummyProgram(programId).title;
  const header = (
    <ProgramHeader
      mode="report"
      studentName={studentName ?? ''}
      programTitle={programTitle}
      crumbs={[...programCrumbs({ programId, programTitle, params }), { label: '종합 리포트' }]}
    />
  );
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // TODO: Firestore에서 studentId+programId 기준 조회
  const report: StudentReport = DUMMY_REPORT;
  const isReportReady = true; // TODO: 실제로는 issueDate 확인

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  function toggleProgram(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedProgram((prev) => (prev === id ? null : id));
  }

  async function handleShare() {
    setSharing(true);
    try {
      const fn = httpsCallable(functions, 'createShareToken');
      const result = await fn({ reportId: report.reportId });
      const data = result.data as { url: string };
      await Share.share({
        title: `${report.studentName} 학생 리포트`,
        message: `ThinkCampus 리포트 링크: ${data.url}`,
        url: data.url,
      });
    } catch (e: any) {
      // 공유 기능 미구현 시 더미 URL로 대체
      try {
        await Share.share({
          title: `${report.studentName} 학생 리포트`,
          message: `ThinkCampus 리포트 (미리보기): https://thinkcampus.app/report/${report.reportId}`,
          url: `https://thinkcampus.app/report/${report.reportId}`,
        });
      } catch {
        Alert.alert('오류', '공유 중 문제가 발생했습니다.');
      }
    } finally {
      setSharing(false);
    }
  }

  if (!isReportReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0c0e13' }}>
        {header}
        <View style={styles.notReady}>
          <Text style={styles.notReadyTitle}>리포트 준비 중</Text>
          <Text style={styles.notReadyDesc}>
            캠프 종료 후 영업일 기준{'\n'}3~5일 내에 업로드됩니다.
          </Text>
        </View>
      </View>
    );
  }

  const gradeColor = getGradeColor(report.totalGrade);
  const gradeBg = getGradeBg(report.totalGrade);

  return (
    <View style={{ flex: 1, backgroundColor: '#0c0e13' }}>
      {header}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4b06a" />
        }
      >
        {/* ── 종합 등급 카드 ───────────────── */}
        <View style={styles.overallCard}>
          <View style={styles.overallTop}>
            <View>
              <Text style={styles.overallStudent}>{studentName ?? report.studentName} 학생</Text>
              <Text style={styles.overallType}>{report.personalityType}</Text>
            </View>
            <View style={[styles.gradeBadge, { backgroundColor: gradeBg }]}>
              <Text style={[styles.gradeText, { color: gradeColor }]}>{report.totalGrade}</Text>
            </View>
          </View>

          <View style={styles.scoreLine}>
            <Text style={styles.scoreValue}>{report.totalScore}</Text>
            <Text style={styles.scoreUnit}>/ 100점</Text>
          </View>

          {/* 강점·성장 분야 */}
          <View style={styles.areasRow}>
            <View style={styles.areaBox}>
              <Text style={styles.areaLabel}>강점 분야</Text>
              {report.strengthAreas.map((a, i) => (
                <Text key={i} style={[styles.areaItem, { color: '#d4b06a' }]}>• {a}</Text>
              ))}
            </View>
            <View style={[styles.areaBox, styles.areaBoxRight]}>
              <Text style={styles.areaLabel}>발전 분야</Text>
              {report.growthAreas.map((a, i) => (
                <Text key={i} style={[styles.areaItem, { color: '#9aa0ab' }]}>• {a}</Text>
              ))}
            </View>
          </View>

          {/* 담임 총평 */}
          <View style={styles.commentBox}>
            <Text style={styles.commentLabel}>담임 총평</Text>
            <Text style={styles.commentText}>{report.overallComment}</Text>
          </View>

          {/* 공유 버튼 */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color="#0c0e13" size="small" />
            ) : (
              <Text style={styles.shareBtnText}>리포트 공유하기</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── 프로그램별 상세 ──────────────── */}
        <Text style={styles.sectionLabel}>프로그램별 평가</Text>

        {report.programs.map((prog) => (
          <ProgramCard
            key={prog.programId}
            program={prog}
            expanded={expandedProgram === prog.programId}
            onToggle={() => toggleProgram(prog.programId)}
          />
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── 프로그램 리포트 카드 ──────────────────────────────────

function ProgramCard({
  program,
  expanded,
  onToggle,
}: {
  program: ProgramReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const gradeColor = getGradeColor(program.grade);
  const gradeBg = getGradeBg(program.grade);

  return (
    <View style={styles.programCard}>
      {/* 카드 헤더 */}
      <TouchableOpacity
        style={styles.programHeader}
        onPress={onToggle}
        activeOpacity={0.8}
      >
        <View style={styles.programHeaderInfo}>
          <Text style={styles.programName} numberOfLines={1}>{program.programName}</Text>
          <Text style={styles.programInstructor}>{program.instructorName}</Text>
        </View>
        <View style={[styles.programGrade, { backgroundColor: gradeBg }]}>
          <Text style={[styles.programGradeText, { color: gradeColor }]}>
            {program.grade}
          </Text>
        </View>
        <Text style={styles.toggleArrow}>{expanded ? '∧' : '∨'}</Text>
      </TouchableOpacity>

      {/* 확장 영역 */}
      {expanded && (
        <View style={styles.programBody}>
          {/* 점수 바 */}
          <View style={styles.scoreRow}>
            <Text style={styles.programScore}>{program.overallScore}점</Text>
            <View style={styles.growthTag}>
              <Text style={styles.growthTagText}>
                +{program.growthIndex}점 성장
              </Text>
            </View>
          </View>

          {/* 역량별 바 차트 */}
          {program.competencies.map((comp) => (
            <View key={comp.label} style={styles.compRow}>
              <Text style={styles.compLabel}>{comp.label}</Text>
              <View style={styles.compBarWrap}>
                {/* 또래 평균 */}
                <View
                  style={[
                    styles.compBenchmarkMark,
                    { left: `${comp.benchmark}%` as any },
                  ]}
                />
                {/* 내 점수 */}
                <View style={styles.compBg}>
                  <View
                    style={[
                      styles.compFill,
                      {
                        width: `${comp.score}%`,
                        backgroundColor: getGradeColor(
                          comp.score >= 90 ? 'S' : comp.score >= 75 ? 'A' : comp.score >= 60 ? 'B' : 'C'
                        ),
                      },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.compScore}>{comp.score}</Text>
            </View>
          ))}
          <Text style={styles.benchmarkNote}>| 또래 평균</Text>

          {/* 강사 코멘트 */}
          <View style={styles.instructorComment}>
            <Text style={styles.instructorCommentLabel}>강사 코멘트</Text>
            <Text style={styles.instructorCommentText}>{program.instructorComment}</Text>
          </View>

          {/* 하이라이트 */}
          {program.highlights.length > 0 && (
            <View style={styles.tagSection}>
              <Text style={styles.tagSectionLabel}>✨ 인상적이었던 점</Text>
              {program.highlights.map((h, i) => (
                <View key={i} style={styles.tagRow}>
                  <View style={styles.tagDot} />
                  <Text style={styles.tagText}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 다음 단계 */}
          {program.nextSteps.length > 0 && (
            <View style={styles.nextStepSection}>
              <Text style={styles.nextStepLabel}>향후 발전 방향</Text>
              {program.nextSteps.map((step, i) => (
                <View key={i} style={styles.nextStepRow}>
                  <Text style={styles.nextStepNum}>{i + 1}</Text>
                  <Text style={styles.nextStepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0c0e13' },
  content: { paddingTop: 16, paddingBottom: 32 },

  notReady: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: '#0c0e13',
  },
  notReadyTitle: { fontSize: 20, fontWeight: '700', color: '#d4d7dd' },
  notReadyDesc: { fontSize: 16, color: '#9aa0ab', textAlign: 'center', lineHeight: 25 },

  overallCard: {
    marginHorizontal: 16,
    backgroundColor: '#161a22',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#262b36',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overallTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  overallStudent: { fontSize: 14, color: '#9aa0ab', marginBottom: 4 },
  overallType: { fontSize: 16, fontWeight: '700', color: '#f2f2f0' },
  gradeBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontSize: 28, fontWeight: '900' },
  scoreLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 16,
  },
  scoreValue: { fontSize: 40, fontWeight: '800', color: '#f2f2f0' },
  scoreUnit: { fontSize: 16, color: '#9aa0ab' },

  areasRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  areaBox: {
    flex: 1,
    backgroundColor: '#0c0e13',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  areaBoxRight: { backgroundColor: '#1e232d' },
  areaLabel: { fontSize: 14, fontWeight: '700', color: '#d4d7dd', marginBottom: 2 },
  areaItem: { fontSize: 14, fontWeight: '500' },

  commentBox: {
    backgroundColor: '#1e232d',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#d4b06a',
    marginBottom: 14,
  },
  commentLabel: {
    fontSize: 14,
    color: '#9aa0ab',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  commentText: { fontSize: 15, color: '#d4d7dd', lineHeight: 24 },

  shareBtn: {
    backgroundColor: '#d4b06a',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  shareBtnText: { color: '#0c0e13', fontSize: 16, fontWeight: '700' },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9aa0ab',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  programCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#161a22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262b36',
    overflow: 'hidden',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  programIcon: { fontSize: 24 },
  programHeaderInfo: { flex: 1 },
  programName: { fontSize: 16, fontWeight: '700', color: '#f2f2f0' },
  programInstructor: { fontSize: 14, color: '#9aa0ab', marginTop: 2 },
  programGrade: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programGradeText: { fontSize: 17, fontWeight: '800' },
  toggleArrow: { fontSize: 14, color: '#9aa0ab', marginLeft: 2 },

  programBody: {
    borderTopWidth: 1,
    borderTopColor: '#262b36',
    padding: 14,
    gap: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  programScore: { fontSize: 22, fontWeight: '800', color: '#f2f2f0' },
  growthTag: {
    backgroundColor: '#1e232d',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#343a47',
  },
  growthTagText: { fontSize: 14, color: '#d4b06a', fontWeight: '700' },

  // 역량 바
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compLabel: { width: 80, fontSize: 14, color: '#d4d7dd' },
  compBarWrap: { flex: 1, position: 'relative' },
  compBg: {
    height: 8,
    backgroundColor: '#343a47',
    borderRadius: 4,
    overflow: 'hidden',
  },
  compFill: { height: 8, borderRadius: 4 },
  compBenchmarkMark: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 14,
    backgroundColor: '#9ca3af',
    zIndex: 1,
    borderRadius: 1,
  },
  compScore: { width: 34, fontSize: 14, fontWeight: '700', color: '#d4d7dd', textAlign: 'right' },
  benchmarkNote: { fontSize: 14, color: '#9aa0ab', textAlign: 'right' },

  instructorComment: {
    backgroundColor: '#1e232d',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#343a47',
  },
  instructorCommentLabel: {
    fontSize: 14,
    color: '#9aa0ab',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  instructorCommentText: { fontSize: 15, color: '#d4d7dd', lineHeight: 23 },

  tagSection: { gap: 6 },
  tagSectionLabel: { fontSize: 14, fontWeight: '700', color: '#d4d7dd' },
  tagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#d4b06a',
    marginTop: 7,
  },
  tagText: { flex: 1, fontSize: 14, color: '#d4d7dd', lineHeight: 22 },

  nextStepSection: {
    backgroundColor: '#1e232d',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  nextStepLabel: { fontSize: 14, fontWeight: '700', color: '#d4b06a', marginBottom: 4 },
  nextStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  nextStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#d4b06a',
    color: '#0c0e13',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  nextStepText: { flex: 1, fontSize: 14, color: '#d4d7dd', lineHeight: 22 },
});
