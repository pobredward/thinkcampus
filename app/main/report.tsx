/**
 * 리포트 탭
 * - 자녀 2명 이상 → 상단 탭으로 전환
 * - 별도 상세 화면 없이 전체 리포트를 인라인으로 표시
 * - 임시 URL 생성(클립보드 복사) + PDF 공유
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Clipboard,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Share,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from '../../firebase';
import {
  DUMMY_REPORT,
  getGradeColor,
  getGradeBg,
  type StudentReport,
  type ProgramReport,
  type CompetencyScore,
} from '../../data/dummyReport';

// 안드로이드 LayoutAnimation 활성화
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── 더미: 자녀 2명 리포트 시뮬레이션 ────────────────────
// 실제로는 Firestore에서 guardianUid 기준으로 조회
const DUMMY_CHILD2: StudentReport = {
  ...DUMMY_REPORT,
  reportId: 'report-2026-002',
  studentId: 'student-002',
  studentName: '김서연',
  totalScore: 76,
  totalGrade: 'B',
  personalityType: '소통형 협력인재 (CONNECTOR)',
  personalityDesc: '타인과의 소통을 즐기고, 모둠 활동에서 뛰어난 리더십을 발휘합니다.',
  overallComment: '서연이는 협력과 소통 능력이 매우 뛰어나며, 특히 디베이트와 심리학 수업에서 두각을 나타냈습니다.',
  strengthAreas: ['디베이트', '유소년 심리학', '한국사 인문학'],
  growthAreas: ['AI/SW 코딩', '수학적 사고'],
  programs: DUMMY_REPORT.programs.map((p, i) => ({
    ...p,
    overallScore: Math.max(55, p.overallScore - 8 + (i % 3 === 0 ? 10 : 0)),
    preScore: p.preScore - 5,
    postScore: p.postScore - 8,
    growthIndex: p.growthIndex - 3,
    grade: p.overallScore - 8 >= 90 ? 'S' : p.overallScore - 8 >= 75 ? 'A' : 'B',
  })) as ProgramReport[],
};

const ALL_REPORTS = [DUMMY_REPORT, DUMMY_CHILD2];

// ── PDF HTML 빌더 ─────────────────────────────────────────
function buildPdfHtml(report: StudentReport): string {
  const gradeColorMap: Record<string, string> = {
    S: '#7c3aed', A: '#1d4ed8', B: '#0369a1', C: '#6b7280',
  };
  const programRows = report.programs.map((p) => {
    const color = gradeColorMap[p.grade];
    const compRows = p.competencies.map((c) => `
      <tr>
        <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;">${c.label}</td>
        <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="flex:1;background:#f3f4f6;border-radius:4px;height:7px;">
              <div style="width:${c.score}%;background:${color};height:7px;border-radius:4px;"></div>
            </div>
            <b style="color:${color};min-width:26px;">${c.score}</b>
          </div>
        </td>
        <td style="padding:7px 10px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:12px;">평균 ${c.benchmark}</td>
      </tr>`).join('');

    return `
      <div style="margin-bottom:28px;break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:2px solid #e5e7eb;margin-bottom:10px;">
          <span style="font-size:20px;">${p.programIcon}</span>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;">${p.programName}</div>
            <div style="font-size:12px;color:#6b7280;">강사 ${p.instructorName} · 출석 ${p.attendance}%</div>
          </div>
          <span style="font-size:22px;font-weight:900;color:${color};">${p.grade}</span>
          <span style="font-size:20px;font-weight:700;color:${color};">${p.overallScore}점</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
          <thead><tr style="background:#f8fafc;">
            <th style="padding:7px 10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">역량</th>
            <th style="padding:7px 10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">점수</th>
            <th style="padding:7px 10px;text-align:left;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;">비교</th>
          </tr></thead>
          <tbody>${compRows}</tbody>
        </table>
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:8px;">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">강사 총평</div>
          <div style="font-size:13px;color:#374151;line-height:1.7;">${p.instructorComment}</div>
        </div>
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:4px;">향후 발전 방향</div>
        ${p.nextSteps.map((s, i) => `<div style="font-size:13px;color:#6b7280;margin-bottom:3px;">${i + 1}. ${s}</div>`).join('')}
      </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"/>
  <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,Arial,sans-serif;padding:28px;color:#111827;}</style>
  </head><body>
  <div style="background:#1d4ed8;border-radius:14px;padding:24px;margin-bottom:24px;color:#fff;">
    <div style="font-size:12px;color:#bfdbfe;margin-bottom:4px;">ThinkCampus 학습 리포트</div>
    <div style="font-size:26px;font-weight:900;margin-bottom:4px;">${report.studentName} 학생</div>
    <div style="font-size:13px;color:#bfdbfe;">${report.campusName} · ${report.campPeriod}</div>
    <div style="display:flex;gap:12px;margin-top:16px;">
      <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 20px;text-align:center;">
        <div style="font-size:32px;font-weight:900;">${report.totalGrade}</div>
        <div style="font-size:11px;color:#bfdbfe;">종합 등급</div>
      </div>
      <div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 20px;text-align:center;">
        <div style="font-size:32px;font-weight:900;">${report.totalScore}</div>
        <div style="font-size:11px;color:#bfdbfe;">종합 점수</div>
      </div>
    </div>
  </div>
  <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid #e5e7eb;">
    <div style="font-size:13px;font-weight:700;margin-bottom:6px;">${report.personalityType}</div>
    <div style="font-size:13px;color:#374151;line-height:1.7;">${report.personalityDesc}</div>
  </div>
  <div style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:24px;border:1px solid #e5e7eb;">
    <div style="font-size:12px;font-weight:700;color:#6b7280;margin-bottom:8px;">담임 강사 종합 총평</div>
    <div style="font-size:14px;color:#374151;line-height:1.8;">${report.overallComment}</div>
  </div>
  <div style="font-size:17px;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #1d4ed8;">프로그램별 상세 평가</div>
  ${programRows}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px;">
    발급일: ${report.issueDate} · ThinkCampus 공식 리포트
  </div>
  </body></html>`;
}

// ── 공유 URL 생성 (Cloud Function 호출) ──────────────────
const createShareTokenFn = httpsCallable<
  { reportId: string },
  { url: string; expiresAt: string }
>(functions, 'createShareToken');

// ── 메인 컴포넌트 ──────────────────────────────────────────

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Firestore에서 리포트 데이터 재조회
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const reports = ALL_REPORTS;
  const report = reports[selectedIdx];
  const gradeColor = getGradeColor(report.totalGrade);
  const gradeBg = getGradeBg(report.totalGrade);

  function toggleProgram(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedProgram((prev) => (prev === id ? null : id));
  }

  async function handleShare() {
    setShareLoading(true);
    try {
      // 실제 리포트는 Firestore에서 오므로 reportId 사용
      // 더미 데이터 단계에서는 Cloud Function이 not-found를 반환할 수 있으므로
      // 에러 시 Clipboard 복사 fallback 처리
      let url: string;
      try {
        const result = await createShareTokenFn({ reportId: report.reportId });
        url = result.data.url;
      } catch (fnErr: any) {
        // 더미 데이터 / 개발 환경 fallback: btoa 기반 임시 URL
        const raw = `${report.reportId}:${Date.now()}`;
        const token = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '').slice(0, 20);
        url = `https://report.thinkcampus.kr/r/${token}`;
      }

      // 시스템 공유 시트 (카카오톡, 문자, 메일 등)
      await Share.share({
        title: `${report.studentName} 학습 리포트`,
        message: `[ThinkCampus] ${report.studentName} 학생의 학습 리포트를 공유합니다.\n\n${url}\n\n※ 링크는 7일 후 만료됩니다.`,
        url, // iOS only
      });
    } catch (e: any) {
      // 사용자가 공유를 취소한 경우는 무시, 실제 오류만 알림
      if (e?.message !== 'User did not share') {
        Alert.alert('공유 오류', e?.message ?? '알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setShareLoading(false);
    }
  }

  async function handlePdf() {
    setPdfLoading(true);
    try {
      const Print = await import('expo-print').catch(() => null);
      const Sharing = await import('expo-sharing').catch(() => null);
      if (!Print) {
        Alert.alert('PDF 기능 준비 중', '앱 업데이트 후 이용 가능합니다.');
        return;
      }
      const html = buildPdfHtml(report);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = Sharing && await Sharing.isAvailableAsync();
      if (canShare && Sharing) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${report.studentName} 학습 리포트`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF 저장', `저장 위치: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('오류', e.message);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* ── 고정 헤더 ── */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>학습 리포트</Text>
          {/* 공유 · PDF 버튼 */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleShare}
              disabled={shareLoading}
            >
              {shareLoading
                ? <ActivityIndicator size="small" color="#1d4ed8" />
                : <Text style={styles.actionBtnText}>🔗 링크 공유</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnPrimary]}
              onPress={handlePdf}
              disabled={pdfLoading}
            >
              {pdfLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.actionBtnPrimaryText}>PDF</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 자녀 전환 탭 (2명 이상일 때만 표시) ── */}
        {reports.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.childTabScroll}
            contentContainerStyle={styles.childTabContent}
          >
            {reports.map((r, i) => (
              <TouchableOpacity
                key={r.reportId}
                style={[styles.childTab, selectedIdx === i && styles.childTabActive]}
                onPress={() => {
                  setSelectedIdx(i);
                  setExpandedProgram(null);
                }}
              >
                <View style={[styles.childTabAvatar, selectedIdx === i && styles.childTabAvatarActive]}>
                  <Text style={[styles.childTabAvatarText, selectedIdx === i && { color: '#fff' }]}>
                    {r.studentName.charAt(0)}
                  </Text>
                </View>
                <Text style={[styles.childTabName, selectedIdx === i && styles.childTabNameActive]}>
                  {r.studentName}
                </Text>
                <View style={[styles.childTabGrade, { backgroundColor: getGradeBg(r.totalGrade) }]}>
                  <Text style={[styles.childTabGradeText, { color: getGradeColor(r.totalGrade) }]}>
                    {r.totalGrade}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── 스크롤 콘텐츠 ── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />
        }
      >
        {/* 종합 헤더 카드 */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{report.studentName.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{report.studentName} 학생</Text>
              <Text style={styles.heroCampus}>{report.campusName}</Text>
              <Text style={styles.heroPeriod}>{report.campPeriod}</Text>
            </View>
            <View style={[styles.heroGradeBadge, { backgroundColor: gradeBg }]}>
              <Text style={[styles.heroGradeText, { color: gradeColor }]}>
                {report.totalGrade}
              </Text>
            </View>
          </View>

          {/* 종합 점수 바 */}
          <View style={styles.totalScoreRow}>
            <Text style={styles.totalScoreLabel}>종합 점수</Text>
            <Text style={[styles.totalScoreNum, { color: gradeColor }]}>{report.totalScore}점</Text>
          </View>
          <View style={styles.totalBarBg}>
            <View style={[styles.totalBarFill, { width: `${report.totalScore}%`, backgroundColor: gradeColor }]} />
          </View>

          {/* 성향 유형 */}
          <View style={styles.personalityBox}>
            <Text style={styles.personalityType}>{report.personalityType}</Text>
            <Text style={styles.personalityDesc}>{report.personalityDesc}</Text>
          </View>
        </View>

        {/* 강점 / 발전 */}
        <View style={styles.twoCol}>
          <View style={[styles.twoColCard, styles.strengthCard]}>
            <Text style={styles.twoColLabel}>강점 분야</Text>
            {report.strengthAreas.map((s, i) => (
              <View key={i} style={styles.twoColRow}>
                <View style={styles.greenDot} />
                <Text style={styles.strengthText}>{s}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.twoColCard, styles.growthCard]}>
            <Text style={[styles.twoColLabel, { color: '#1e40af' }]}>발전 권장</Text>
            {report.growthAreas.map((s, i) => (
              <View key={i} style={styles.twoColRow}>
                <View style={styles.blueDot} />
                <Text style={styles.growthText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 담임 총평 */}
        <View style={styles.commentCard}>
          <Text style={styles.sectionLabel}>담임 강사 종합 총평</Text>
          <Text style={styles.commentText}>{report.overallComment}</Text>
        </View>

        {/* 프로그램별 상세 */}
        <Text style={styles.programSectionTitle}>프로그램별 상세 평가</Text>
        <Text style={styles.programSectionHint}>항목을 탭하면 역량 상세를 펼칩니다.</Text>

        {report.programs.map((prog) => (
          <ProgramCard
            key={prog.programId}
            prog={prog}
            expanded={expandedProgram === prog.programId}
            onToggle={() => toggleProgram(prog.programId)}
          />
        ))}

        {/* 발급 정보 */}
        <View style={styles.issueMeta}>
          <Text style={styles.issueMetaText}>
            발급일 {report.issueDate} · ThinkCampus 공식 리포트
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── 프로그램 카드 ──────────────────────────────────────────

function ProgramCard({
  prog,
  expanded,
  onToggle,
}: {
  prog: ProgramReport;
  expanded: boolean;
  onToggle: () => void;
}) {
  const gradeColor = getGradeColor(prog.grade);
  const gradeBg = getGradeBg(prog.grade);

  return (
    <View style={styles.progCard}>
      {/* 헤더 */}
      <TouchableOpacity style={styles.progHeader} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.progIcon}>{prog.programIcon}</Text>
        <View style={styles.progTitleWrap}>
          <Text style={styles.progName}>{prog.programName}</Text>
          <Text style={styles.progMeta}>강사 {prog.instructorName} · 출석 {prog.attendance}%</Text>
        </View>
        <View style={[styles.progGradeBadge, { backgroundColor: gradeBg }]}>
          <Text style={[styles.progGradeText, { color: gradeColor }]}>{prog.grade}</Text>
        </View>
        <Text style={[styles.progScore, { color: gradeColor }]}>{prog.overallScore}</Text>
        <Text style={[styles.expandChevron, expanded && styles.expandChevronOpen]}>›</Text>
      </TouchableOpacity>

      {/* 점수 바 + 성장 칩 */}
      <View style={styles.progBarRow}>
        <View style={styles.progBarBg}>
          <View style={[styles.progBarFill, { width: `${prog.overallScore}%`, backgroundColor: gradeColor }]} />
        </View>
        <View style={styles.growthChip}>
          <Text style={styles.growthChipText}>+{prog.growthIndex}↑</Text>
        </View>
      </View>

      {/* 확장 영역 */}
      {expanded && (
        <View style={styles.progExpanded}>
          {/* 성장 before/after */}
          <View style={styles.beforeAfterRow}>
            <View style={styles.beforeAfterItem}>
              <Text style={styles.beforeAfterLabel}>캠프 전</Text>
              <Text style={styles.beforeAfterScore}>{prog.preScore}점</Text>
            </View>
            <Text style={styles.beforeAfterArrow}>→</Text>
            <View style={styles.beforeAfterItem}>
              <Text style={[styles.beforeAfterLabel, { color: gradeColor }]}>캠프 후</Text>
              <Text style={[styles.beforeAfterScore, { color: gradeColor }]}>{prog.postScore}점</Text>
            </View>
            <View style={[styles.growthBadge, { backgroundColor: gradeBg }]}>
              <Text style={[styles.growthBadgeText, { color: gradeColor }]}>
                +{prog.growthIndex}점 향상
              </Text>
            </View>
          </View>

          {/* 역량 항목 */}
          <Text style={styles.subLabel}>역량별 평가</Text>
          {prog.competencies.map((c, i) => (
            <CompRow key={i} comp={c} color={gradeColor} />
          ))}

          {/* 강사 총평 */}
          <View style={styles.instrBox}>
            <Text style={styles.instrLabel}>강사 총평</Text>
            <Text style={styles.instrText}>{prog.instructorComment}</Text>
          </View>

          {/* 인상적이었던 점 */}
          {prog.highlights.length > 0 && (
            <View style={styles.highlightBox}>
              <Text style={styles.highlightLabel}>인상적이었던 점</Text>
              {prog.highlights.map((h, i) => (
                <View key={i} style={styles.highlightRow}>
                  <Text style={styles.highlightStar}>★</Text>
                  <Text style={styles.highlightText}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 향후 발전 방향 */}
          <View style={styles.nextBox}>
            <Text style={styles.nextLabel}>향후 발전 방향</Text>
            {prog.nextSteps.map((s, i) => (
              <View key={i} style={styles.nextRow}>
                <View style={styles.nextNum}>
                  <Text style={styles.nextNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.nextText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function CompRow({ comp, color }: { comp: CompetencyScore; color: string }) {
  const diff = comp.score - comp.benchmark;
  return (
    <View style={styles.compRow}>
      <View style={styles.compLabelWrap}>
        <Text style={styles.compLabel}>{comp.label}</Text>
        <Text style={styles.compDesc}>{comp.description}</Text>
      </View>
      <View style={styles.compRight}>
        <View style={styles.compBarBg}>
          <View style={[styles.compBarFill, { width: `${comp.score}%`, backgroundColor: color }]} />
          {/* 또래 평균선 */}
          <View style={[styles.benchmarkLine, { left: `${comp.benchmark}%` }]} />
        </View>
        <Text style={[styles.compScore, { color }]}>{comp.score}</Text>
        <Text style={[styles.compDiff, { color: diff >= 0 ? '#16a34a' : '#dc2626' }]}>
          {diff >= 0 ? `+${diff}` : `${diff}`}
        </Text>
      </View>
    </View>
  );
}

// ── 스타일 ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  fixedHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7, minWidth: 36, alignItems: 'center',
  },
  actionBtnText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  actionBtnPrimary: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  actionBtnPrimaryText: { fontSize: 15, color: '#fff', fontWeight: '700' },

  // 자녀 전환 탭
  childTabScroll: { marginBottom: 0 },
  childTabContent: { paddingBottom: 0, gap: 8 },
  childTab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  childTabActive: { borderBottomColor: '#1d4ed8' },
  childTabAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center',
  },
  childTabAvatarActive: { backgroundColor: '#1d4ed8' },
  childTabAvatarText: { fontSize: 14, fontWeight: '700', color: '#374151' },
  childTabName: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  childTabNameActive: { color: '#1d4ed8', fontWeight: '700' },
  childTabGrade: {
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  childTabGradeText: { fontSize: 14, fontWeight: '800' },

  scrollContent: { paddingTop: 16 },

  // 종합 헤더 카드
  heroCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#ffffff', borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: '#e5e7eb',
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  heroAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { fontSize: 22, fontWeight: '700', color: '#1d4ed8' },
  heroName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  heroCampus: { fontSize: 14, color: '#6b7280', marginTop: 1 },
  heroPeriod: { fontSize: 14, color: '#6b7280', marginTop: 1 },
  heroGradeBadge: {
    width: 46, height: 46, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  heroGradeText: { fontSize: 24, fontWeight: '900' },
  totalScoreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalScoreLabel: { fontSize: 14, color: '#6b7280' },
  totalScoreNum: { fontSize: 15, fontWeight: '700' },
  totalBarBg: { height: 7, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  totalBarFill: { height: 7, borderRadius: 4 },
  personalityBox: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  personalityType: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  personalityDesc: { fontSize: 14, color: '#374151', lineHeight: 21 },

  // 강점 / 발전
  twoCol: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 12 },
  twoColCard: { flex: 1, borderRadius: 14, padding: 13, borderWidth: 1 },
  strengthCard: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  growthCard: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  twoColLabel: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 8 },
  twoColRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  greenDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#22c55e' },
  blueDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#60a5fa' },
  strengthText: { fontSize: 14, color: '#16a34a', flex: 1 },
  growthText: { fontSize: 14, color: '#1d4ed8', flex: 1 },

  // 담임 총평
  commentCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: '#ffffff', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#e5e7eb',
  },
  sectionLabel: {
    fontSize: 14, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  commentText: { fontSize: 15, color: '#374151', lineHeight: 23 },

  // 프로그램 섹션 제목
  programSectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#111827',
    marginHorizontal: 20, marginBottom: 4,
  },
  programSectionHint: {
    fontSize: 14, color: '#6b7280',
    marginHorizontal: 20, marginBottom: 10,
  },

  // 프로그램 카드
  progCard: {
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: '#ffffff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden',
  },
  progHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  progIcon: { fontSize: 22 },
  progTitleWrap: { flex: 1 },
  progName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  progMeta: { fontSize: 14, color: '#6b7280', marginTop: 1 },
  progGradeBadge: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  progGradeText: { fontSize: 16, fontWeight: '900' },
  progScore: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'right' },
  expandChevron: { fontSize: 22, color: '#6b7280', marginLeft: 2 },
  expandChevronOpen: { transform: [{ rotate: '90deg' }], color: '#1d4ed8' },

  progBarRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingBottom: 12,
  },
  progBarBg: { flex: 1, height: 5, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progBarFill: { height: 5, borderRadius: 3 },
  growthChip: {
    backgroundColor: '#f0fdf4', borderRadius: 8,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  growthChipText: { fontSize: 14, color: '#16a34a', fontWeight: '700' },

  // 확장 영역
  progExpanded: {
    borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 14,
  },
  beforeAfterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  beforeAfterItem: { alignItems: 'center' },
  beforeAfterLabel: { fontSize: 14, color: '#6b7280', marginBottom: 2 },
  beforeAfterScore: { fontSize: 20, fontWeight: '800', color: '#374151' },
  beforeAfterArrow: { fontSize: 17, color: '#6b7280' },
  growthBadge: {
    marginLeft: 'auto', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  growthBadgeText: { fontSize: 14, fontWeight: '700' },

  subLabel: {
    fontSize: 14, fontWeight: '700', color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },
  compRow: { marginBottom: 10 },
  compLabelWrap: { marginBottom: 3 },
  compLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  compDesc: { fontSize: 14, color: '#6b7280' },
  compRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  compBarBg: {
    flex: 1, height: 7, backgroundColor: '#f3f4f6',
    borderRadius: 4, overflow: 'hidden', position: 'relative',
  },
  compBarFill: { height: 7, borderRadius: 4 },
  benchmarkLine: {
    position: 'absolute', top: -1, bottom: -1,
    width: 2, backgroundColor: '#f59e0b',
  },
  compScore: { fontSize: 15, fontWeight: '800', minWidth: 24, textAlign: 'right' },
  compDiff: { fontSize: 14, fontWeight: '600', minWidth: 28 },

  instrBox: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12,
    marginTop: 12, marginBottom: 8,
  },
  instrLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 5 },
  instrText: { fontSize: 15, color: '#374151', lineHeight: 23 },

  highlightBox: {
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#fde68a',
  },
  highlightLabel: { fontSize: 14, fontWeight: '700', color: '#92400e', marginBottom: 7 },
  highlightRow: { flexDirection: 'row', gap: 5, marginBottom: 4 },
  highlightStar: { fontSize: 14, color: '#f59e0b', marginTop: 2 },
  highlightText: { flex: 1, fontSize: 14, color: '#78350f', lineHeight: 20 },

  nextBox: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  nextLabel: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 7 },
  nextRow: { flexDirection: 'row', gap: 8, marginBottom: 5, alignItems: 'flex-start' },
  nextNum: {
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  nextNumText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  nextText: { flex: 1, fontSize: 14, color: '#1e40af', lineHeight: 20 },

  issueMeta: {
    marginHorizontal: 20, marginTop: 8, alignItems: 'center',
  },
  issueMetaText: { fontSize: 14, color: '#6b7280' },
});
