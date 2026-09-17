/**
 * 회원 탈퇴 — 내 정보 맨 아래 "회원 탈퇴"에서 진입 (웹 /main/profile/withdraw 와 같은 흐름)
 *
 *   안내(무엇이 사라지는지) → [확인했어요] 체크 → [회원 탈퇴하기] → 한 번 더 확인
 *   → deleteAccount (Cloud Function: 내 연결 정보 정리 + 로그인 계정 삭제)
 *   → 로그아웃 → /goodbye
 *
 * App Store 심사 기준(앱 안에서 계정 삭제 가능)을 충족하기 위한 화면.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { signOut } from '@react-native-firebase/auth';
import { httpsCallable } from '@react-native-firebase/functions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, functions } from '../../../firebase';
import { useChildren } from '../../../hooks/useChildren';
import { clearSelectedChild } from '../../../hooks/useSelectedChild';
import { CALL_CENTER_PHONE } from '../../../lib/contact';
import { errMessage } from '../../../lib/errors';

function formatPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  return e164.replace('+82', '0').replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
}

export default function WithdrawScreen() {
  const insets = useSafeAreaInsets();
  const { user, children, loading } = useChildren();
  const [agreed, setAgreed] = useState(false);
  const [working, setWorking] = useState(false);

  const phone = formatPhone(user?.phoneNumber);
  const childNames = [...new Set(children.map((c) => c.studentName))];

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/main/profile');
  };

  function confirmWithdraw() {
    if (!agreed || working || !user) return;
    Alert.alert('정말 탈퇴할까요?', '탈퇴하면 되돌릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      { text: '탈퇴', style: 'destructive', onPress: () => void doWithdraw() },
    ]);
  }

  async function doWithdraw() {
    if (!user) return;
    setWorking(true);
    const uid = user.uid;
    try {
      const fn = httpsCallable(functions, 'deleteAccount');
      await fn({ confirm: true });
    } catch (e) {
      setWorking(false);
      Alert.alert(
        '탈퇴하지 못했어요',
        errMessage(e, `잠시 후 다시 시도해 주세요. 계속 안 되면 ${CALL_CENTER_PHONE} 로 연락해 주세요.`),
      );
      return;
    }
    clearSelectedChild(uid);
    try {
      await signOut(auth);
    } catch {
      // 계정은 이미 삭제됨 — 로컬 로그아웃 실패는 무시하고 안내 화면으로
    }
    router.replace('/goodbye');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={8} accessibilityRole="button">
          <Text style={styles.backText}>← 내 정보</Text>
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          회원 탈퇴
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>탈퇴하면 이렇게 돼요</Text>
        <View style={{ gap: 16 }}>
          <Item icon="👧">
            {loading ? (
              '연결된 자녀의 출결·수업·리포트를 더 이상 볼 수 없어요.'
            ) : childNames.length > 0 ? (
              <>
                <Text style={styles.bold}>{childNames.join(', ')}</Text> 학생의 출결·수업·리포트를 더 이상 볼 수
                없어요.
              </>
            ) : (
              '연결된 자녀 정보가 모두 해제돼요.'
            )}
          </Item>
          <Item icon="🔗">내가 보낸 리포트 공유 링크가 바로 사용 중지돼요.</Item>
          <Item icon="📱">
            로그인 정보{phone ? <> (<Text style={styles.bold}>{phone}</Text>)</> : null}가 삭제되고,{' '}
            <Text style={styles.bold}>되돌릴 수 없어요.</Text>
          </Item>
          <Item icon="↩️">
            다시 이용하려면 캠퍼스에서 등록코드를 새로 받거나, 다른 보호자에게 초대를 받아야 해요.
          </Item>
        </View>
        <View style={styles.note}>
          <Text style={styles.noteText} lineBreakStrategyIOS="hangul-word">
            자녀의 수업 기록은 캠퍼스 운영 자료라 삭제되지 않아요. 다른 보호자는 계속 볼 수 있어요.
          </Text>
        </View>
      </View>

      <Pressable
        style={styles.agreeRow}
        onPress={() => setAgreed((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
      >
        <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
          {agreed && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.agreeText}>위 내용을 모두 확인했어요</Text>
      </Pressable>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.withdrawBtn, !(agreed && !working) && styles.withdrawBtnOff]}
          onPress={confirmWithdraw}
          disabled={!agreed || working}
          accessibilityRole="button"
          accessibilityState={{ disabled: !agreed || working }}
        >
          {working ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.withdrawText}>회원 탈퇴하기</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={goBack} disabled={working}>
          <Text style={styles.cancelText}>취소</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Item({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={styles.itemText} lineBreakStrategyIOS="hangul-word">
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingRight: 8, marginBottom: 8 },
  backText: { fontSize: 16, fontWeight: '500', color: '#1d4ed8' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827' },

  card: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
  },
  cardTitle: { marginBottom: 16, fontSize: 18, fontWeight: '700', color: '#111827' },
  item: { flexDirection: 'row', gap: 12 },
  itemIcon: { width: 28, textAlign: 'center', fontSize: 20, lineHeight: 26 },
  itemText: { flex: 1, fontSize: 16, lineHeight: 26, color: '#1f2937' },
  bold: { fontWeight: '700' },
  note: { marginTop: 20, borderRadius: 16, backgroundColor: '#f9fafb', paddingHorizontal: 16, paddingVertical: 12 },
  noteText: { fontSize: 15, lineHeight: 23, color: '#4b5563' },

  agreeRow: {
    marginHorizontal: 20,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  checkMark: { fontSize: 16, fontWeight: '800', color: '#ffffff', lineHeight: 20 },
  agreeText: { flex: 1, fontSize: 17, fontWeight: '600', color: '#111827' },

  actions: { marginHorizontal: 20, marginTop: 20, gap: 8 },
  withdrawBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: '#dc2626' },
  withdrawBtnOff: { backgroundColor: '#fca5a5' },
  withdrawText: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  cancelBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  cancelText: { fontSize: 17, fontWeight: '600', color: '#4b5563' },
});
