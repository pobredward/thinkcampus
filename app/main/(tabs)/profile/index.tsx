/**
 * 내 정보 탭
 * - 보호자 정보 확인
 * - 자녀 목록 + 보호자 초대
 * - 로그아웃 · 회원 탈퇴(/main/profile/withdraw)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { signOut } from '@react-native-firebase/auth';
import { httpsCallable } from '@react-native-firebase/functions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, functions } from '../../../firebase';
import { useChildren } from '../../../hooks/useChildren';
import { clearSelectedChild } from '../../../hooks/useSelectedChild';
import { errMessage } from '../../../lib/errors';

const RELATION_PRESETS = ['부(아빠)', '조모(할머니)', '조부(할아버지)', '이모', '삼촌', '기타'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, children, loading, refreshing, refresh } = useChildren({ activeOnly: true });
  const [signingOut, setSigningOut] = useState(false);

  // 초대 모달
  const [inviteModal, setInviteModal] = useState<{
    visible: boolean;
    studentId: string;
    studentName: string;
  }>({ visible: false, studentId: '', studentName: '' });
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRelation, setInviteRelation] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  async function handleSignOut() {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            if (user) clearSelectedChild(user.uid);
            await signOut(auth);
            router.replace('/onboarding');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  async function handleInvite() {
    if (invitePhone.replace(/\D/g, '').length < 10) {
      Alert.alert('확인', '올바른 전화번호를 입력해주세요.');
      return;
    }
    if (!inviteRelation.trim()) {
      Alert.alert('확인', '관계를 선택하거나 입력해주세요.');
      return;
    }
    setInviteLoading(true);
    try {
      const fn = httpsCallable(functions, 'addGuardianPhone');
      await fn({
        studentId: inviteModal.studentId,
        phone: invitePhone.trim(),
        relation: inviteRelation.trim(),
      });
      Alert.alert(
        '초대 완료',
        `${invitePhone} 번호를 추가했습니다.\n해당 번호로 앱에 로그인하면 자동으로 연결됩니다.`,
        [{ text: '확인', onPress: () => setInviteModal((m) => ({ ...m, visible: false })) }]
      );
      setInvitePhone('');
      setInviteRelation('');
    } catch (e) {
      Alert.alert('오류', errMessage(e, '오류가 발생했습니다.'));
    } finally {
      setInviteLoading(false);
    }
  }

  const formattedPhone = user?.phoneNumber
    ? user.phoneNumber.replace('+82', '0').replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
    : '번호 없음';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#1d4ed8" />
      }
    >
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>내 정보</Text>
      </View>

      {/* 보호자 정보 카드 */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>보호자</Text>
        </View>
        <View>
          <Text style={styles.profilePhone}>{formattedPhone}</Text>
          <Text style={styles.profileRole}>학부모 계정</Text>
        </View>
      </View>

      {/* 자녀 목록 */}
      <Text style={styles.sectionTitle}>연결된 자녀</Text>

      {loading ? (
        <ActivityIndicator color="#1d4ed8" style={{ marginTop: 16 }} />
      ) : children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>연결된 자녀가 없습니다</Text>
        </View>
      ) : (
        children.map((child) => (
          <View key={child.enrollmentId} style={styles.childCard}>
            <View>
              <Text style={styles.childName}>{child.studentName}</Text>
              <Text style={styles.childSub}>
                {child.campusName}
                {child.relation ? ` · ${child.relation}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.inviteBtn}
              onPress={() => {
                setInvitePhone('');
                setInviteRelation('');
                setInviteModal({
                  visible: true,
                  studentId: child.studentId,
                  studentName: child.studentName,
                });
              }}
            >
              <Text style={styles.inviteBtnText}>보호자 초대</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* 메뉴 */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>설정</Text>
      <View style={styles.menuCard}>
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuLabel}>앱 정보</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuLabel}>문의하기</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.menuDivider} />
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuLabel}>개인정보 처리방침</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 로그아웃 */}
      <TouchableOpacity
        style={[styles.signOutBtn, signingOut && { opacity: 0.5 }]}
        onPress={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <Text style={styles.signOutText}>로그아웃</Text>
        )}
      </TouchableOpacity>

      {/* 회원 탈퇴 — 눈에 덜 띄게 */}
      <TouchableOpacity
        style={styles.withdrawLink}
        onPress={() => router.push('/main/profile/withdraw')}
        accessibilityRole="link"
      >
        <Text style={styles.withdrawText}>회원 탈퇴</Text>
      </TouchableOpacity>

      {/* 보호자 초대 모달 */}
      <Modal
        visible={inviteModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteModal((m) => ({ ...m, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>보호자 초대</Text>
            <Text style={styles.modalDesc}>
              <Text style={styles.modalBold}>{inviteModal.studentName}</Text>의 다른 보호자를 초대합니다.{'\n'}
              추가된 번호로 앱에 로그인하면 자동으로 연결됩니다.
            </Text>

            <Text style={styles.fieldLabel}>관계</Text>
            <View style={styles.chips}>
              {RELATION_PRESETS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, inviteRelation === r && styles.chipActive]}
                  onPress={() => setInviteRelation(r)}
                >
                  <Text style={[styles.chipText, inviteRelation === r && styles.chipTextActive]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="직접 입력 (예: 외조모, 고모)"
              placeholderTextColor="#9ca3af"
              value={inviteRelation}
              onChangeText={setInviteRelation}
            />

            <Text style={styles.fieldLabel}>전화번호</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="01012345678"
              placeholderTextColor="#9ca3af"
              value={invitePhone}
              onChangeText={(t) => setInvitePhone(t.replace(/\D/g, '').slice(0, 11))}
              keyboardType="number-pad"
              maxLength={11}
            />

            <TouchableOpacity
              style={[styles.modalBtn, inviteLoading && { opacity: 0.5 }]}
              onPress={handleInvite}
              disabled={inviteLoading}
            >
              {inviteLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalBtnText}>초대 추가</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setInviteModal((m) => ({ ...m, visible: false }))}
            >
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 40 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#111827' },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 14, fontWeight: '600', color: '#1d4ed8' },
  profilePhone: { fontSize: 20, fontWeight: '700', color: '#111827' },
  profileRole: { fontSize: 15, color: '#6b7280', marginTop: 2 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: { fontSize: 16, color: '#6b7280' },
  childCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  childName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  childSub: { fontSize: 14, color: '#6b7280', marginTop: 3 },
  inviteBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  inviteBtnText: { fontSize: 14, color: '#1d4ed8', fontWeight: '600' },
  menuCard: {
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLabel: { fontSize: 16, color: '#111827' },
  menuArrow: { fontSize: 20, color: '#6b7280' },
  menuDivider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },
  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#fff1f2',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
  withdrawLink: { alignSelf: 'center', marginTop: 24, paddingHorizontal: 16, paddingVertical: 8 },
  withdrawText: { fontSize: 16, color: '#6b7280', textDecorationLine: 'underline' },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 44,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  modalDesc: { fontSize: 15, color: '#6b7280', lineHeight: 23, marginBottom: 20 },
  modalBold: { fontWeight: '700', color: '#111827' },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  chipActive: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  chipText: { fontSize: 15, color: '#374151' },
  chipTextActive: { color: '#1d4ed8', fontWeight: '600' },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: '#111827',
    marginBottom: 14,
    backgroundColor: '#f9fafb',
  },
  modalBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalClose: { alignItems: 'center', paddingVertical: 10 },
  modalCloseText: { color: '#6b7280', fontSize: 16 },
});
