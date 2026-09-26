/**
 * 내 정보 탭 (웹 app/main/profile/page.tsx)
 * - 보호자 정보 확인 — 이름(홈 인사말에 쓰임, [이름 수정]) · 전화번호
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
import { auth, functions } from '../../../../firebase';
import { useChildren } from '../../../../hooks/useChildren';
import { guardianNameSaveError, saveGuardianName, useGuardianName } from '../../../../hooks/useGuardianName';
import { GUARDIAN_NAME_MAX, guardianNameError } from '../../../../lib/guardianName';
import { clearSelectedChild } from '../../../../hooks/useSelectedChild';
import { errMessage } from '../../../../lib/errors';

const RELATION_PRESETS = ['부(아빠)', '조모(할머니)', '조부(할아버지)', '이모', '삼촌', '기타'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, children, loading, refreshing, refresh } = useChildren({ activeOnly: true });
  const [signingOut, setSigningOut] = useState(false);

  // 보호자 이름 (홈 인사말)
  const guardianName = useGuardianName();
  const [nameModal, setNameModal] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);

  function openNameModal() {
    setNameValue(guardianName ?? '');
    setNameError(null);
    setNameModal(true);
  }

  async function handleSaveName() {
    const invalid = guardianNameError(nameValue);
    if (invalid) {
      setNameError(invalid);
      return;
    }
    setNameSaving(true);
    try {
      await saveGuardianName(nameValue);
      setNameModal(false);
    } catch (e) {
      setNameError(guardianNameSaveError(e));
    } finally {
      setNameSaving(false);
    }
  }

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
        <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#d4b06a" />
      }
    >
      {/* 헤더 */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>내 정보</Text>
      </View>

      {/* 보호자 정보 카드 — 이름(없으면 입력 안내) · 전화번호 · [이름 수정] */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>보호자</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {guardianName ? (
            <Text style={styles.profileName} numberOfLines={1}>
              {guardianName}
            </Text>
          ) : (
            <Text style={styles.profileNameEmpty}>이름을 입력해 주세요</Text>
          )}
          <Text style={styles.profileRole}>{formattedPhone}</Text>
        </View>
        <TouchableOpacity style={styles.nameBtn} onPress={openNameModal} accessibilityRole="button">
          <Text style={styles.nameBtnText}>{guardianName ? '이름 수정' : '이름 입력'}</Text>
        </TouchableOpacity>
      </View>

      {/* 자녀 목록 */}
      <Text style={styles.sectionTitle}>연결된 자녀</Text>

      {loading ? (
        <ActivityIndicator color="#d4b06a" style={{ marginTop: 16 }} />
      ) : children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>연결된 자녀가 없습니다</Text>
        </View>
      ) : (
        children.map((child) => (
          <View key={child.guardianLinkId} style={styles.childCard}>
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
          <ActivityIndicator color="#f27d78" />
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

      {/* 보호자 이름 입력·수정 */}
      <Modal visible={nameModal} transparent animationType="slide" onRequestClose={() => setNameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>보호자 이름</Text>
            <Text style={styles.modalDesc}>홈에서 &quot;OOO 학부모님&quot;으로 인사드릴 때 쓰는 이름이에요.</Text>
            <Text style={styles.fieldLabel}>이름</Text>
            <TextInput
              style={[styles.modalInput, !!nameError && styles.modalInputError]}
              placeholder="예: 홍길동"
              placeholderTextColor="#9ca3af"
              value={nameValue}
              onChangeText={(t) => {
                setNameValue(t);
                if (nameError) setNameError(null);
              }}
              maxLength={GUARDIAN_NAME_MAX}
              autoComplete="name"
              textContentType="name"
              accessibilityLabel="보호자 이름"
              returnKeyType="done"
              onSubmitEditing={() => void handleSaveName()}
            />
            {!!nameError && (
              <Text style={styles.nameError} accessibilityRole="alert">
                {nameError}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.modalBtn, (nameSaving || !nameValue.trim()) && { opacity: 0.5 }]}
              onPress={() => void handleSaveName()}
              disabled={nameSaving || !nameValue.trim()}
              accessibilityRole="button"
            >
              {nameSaving ? <ActivityIndicator color="#0c0e13" /> : <Text style={styles.modalBtnText}>저장</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalClose} onPress={() => setNameModal(false)} accessibilityRole="button">
              <Text style={styles.modalCloseText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
                <ActivityIndicator color="#0c0e13" />
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
  container: { flex: 1, backgroundColor: '#0c0e13' },
  content: { paddingBottom: 40 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#161a22',
    borderBottomWidth: 1,
    borderBottomColor: '#262b36',
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#f2f2f0' },
  profileCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#161a22',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#262b36',
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1e232d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 14, fontWeight: '600', color: '#d4b06a' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#f2f2f0' },
  profileNameEmpty: { fontSize: 17, fontWeight: '600', color: '#9aa0ab' },
  nameBtn: {
    flexShrink: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262b36',
    backgroundColor: '#1e232d',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  nameBtnText: { fontSize: 15, fontWeight: '600', color: '#d4b06a' },
  nameError: { marginTop: -6, marginBottom: 12, fontSize: 15, color: '#f27d78' },
  profileRole: { fontSize: 15, color: '#9aa0ab', marginTop: 2 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9aa0ab',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    marginHorizontal: 20,
    backgroundColor: '#161a22',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262b36',
  },
  emptyText: { fontSize: 16, color: '#9aa0ab' },
  childCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#161a22',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#262b36',
  },
  childName: { fontSize: 16, fontWeight: '700', color: '#f2f2f0' },
  childSub: { fontSize: 14, color: '#9aa0ab', marginTop: 3 },
  inviteBtn: {
    backgroundColor: '#1e232d',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#343a47',
  },
  inviteBtnText: { fontSize: 14, color: '#d4b06a', fontWeight: '600' },
  menuCard: {
    marginHorizontal: 20,
    backgroundColor: '#161a22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262b36',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuLabel: { fontSize: 16, color: '#f2f2f0' },
  menuArrow: { fontSize: 20, color: '#9aa0ab' },
  menuDivider: { height: 1, backgroundColor: '#1e232d', marginHorizontal: 16 },
  signOutBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#2a1719',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a2326',
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#f27d78' },
  withdrawLink: { alignSelf: 'center', marginTop: 24, paddingHorizontal: 16, paddingVertical: 8 },
  withdrawText: { fontSize: 16, color: '#9aa0ab', textDecorationLine: 'underline' },
  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#161a22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 44,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f2f2f0', marginBottom: 8 },
  modalDesc: { fontSize: 15, color: '#9aa0ab', lineHeight: 23, marginBottom: 20 },
  modalBold: { fontWeight: '700', color: '#f2f2f0' },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#d4d7dd', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: '#262b36',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#1e232d',
  },
  chipActive: { borderColor: '#d4b06a', backgroundColor: '#1e232d' },
  chipText: { fontSize: 15, color: '#d4d7dd' },
  chipTextActive: { color: '#d4b06a', fontWeight: '600' },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#262b36',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    color: '#f2f2f0',
    marginBottom: 14,
    backgroundColor: '#1e232d',
  },
  modalInputError: { borderColor: '#f27d78' },
  modalBtn: {
    backgroundColor: '#d4b06a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalBtnText: { color: '#0c0e13', fontSize: 16, fontWeight: '700' },
  modalClose: { alignItems: 'center', paddingVertical: 10 },
  modalCloseText: { color: '#9aa0ab', fontSize: 16 },
});
