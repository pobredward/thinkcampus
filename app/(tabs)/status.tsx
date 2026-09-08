/**
 * Tab C: 상태
 *
 * - 현재 Firebase Auth 로그인 상태 실시간 구독
 * - uid / phoneNumber 표시
 * - Firestore에서 해당 uid의 enrollments 목록 조회
 * - 로그아웃 버튼
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { firestore } from '../../firebase';

interface Enrollment {
  id: string;
  studentId: string;
  campusId: string;
  gradeAtEnrollment: string;
  status: string;
}

export default function StatusScreen() {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null | undefined>(undefined);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Auth 상태 구독
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  // uid 변경 시 enrollments 조회
  useEffect(() => {
    if (!user) {
      setEnrollments([]);
      return;
    }

    setLoadingEnrollments(true);
    // guardianUids 배열에 현재 uid가 포함된 students를 먼저 찾고,
    // 그 studentId로 enrollments를 조회하는 간단한 2-step 쿼리
    const unsub = firestore()
      .collection('enrollments')
      .where('guardianUid', '==', user.uid)
      .onSnapshot(
        (snap) => {
          const docs = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Enrollment, 'id'>),
          }));
          setEnrollments(docs);
          setLoadingEnrollments(false);
        },
        (err) => {
          console.warn('enrollments 구독 오류:', err.message);
          setLoadingEnrollments(false);
        },
      );
    return unsub;
  }, [user?.uid]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await auth().signOut();
    } catch (e: any) {
      console.warn('로그아웃 실패:', e.message);
    } finally {
      setSigningOut(false);
    }
  }

  // 초기 로딩 (undefined = 아직 확인 안 됨)
  if (user === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.subText}>Auth 상태 확인 중…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>로그인 상태</Text>

      {user === null ? (
        <View style={styles.card}>
          <Text style={styles.statusBadgeOff}>● 로그아웃 상태</Text>
          <Text style={styles.hintText}>
            Tab A(등록코드) 또는 Tab B(OTP) 에서 인증하면 여기에 표시됩니다.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.statusBadgeOn}>● 로그인 됨</Text>

            <Text style={styles.fieldLabel}>uid</Text>
            <Text style={styles.fieldValue} selectable>{user.uid}</Text>

            <Text style={styles.fieldLabel}>phoneNumber</Text>
            <Text style={styles.fieldValue} selectable>
              {user.phoneNumber ?? '(없음)'}
            </Text>

            <Text style={styles.fieldLabel}>email</Text>
            <Text style={styles.fieldValue}>{user.email ?? '(없음)'}</Text>

            <Text style={styles.fieldLabel}>providerData</Text>
            {user.providerData.map((p, i) => (
              <Text key={i} style={styles.fieldMono}>
                {p.providerId} / {p.uid}
              </Text>
            ))}
          </View>

          {/* ── 연결 학생 목록 ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>연결된 등록 ({enrollments.length}건)</Text>
            {loadingEnrollments ? (
              <ActivityIndicator color="#2563eb" style={{ marginTop: 8 }} />
            ) : enrollments.length === 0 ? (
              <Text style={styles.emptyText}>등록된 학생 없음</Text>
            ) : (
              enrollments.map((e) => (
                <View key={e.id} style={styles.enrollRow}>
                  <Text style={styles.enrollText}>
                    [{e.status}] 학생 {e.studentId} · 캠퍼스 {e.campusId} · {e.gradeAtEnrollment}
                  </Text>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity
            style={[styles.signOutButton, signingOut && styles.buttonDisabled]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.signOutText}>로그아웃</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  heading: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statusBadgeOn: { fontSize: 15, fontWeight: '600', color: '#16a34a', marginBottom: 12 },
  statusBadgeOff: { fontSize: 15, fontWeight: '600', color: '#9ca3af', marginBottom: 8 },
  hintText: { fontSize: 13, color: '#6b7280' },
  fieldLabel: { fontSize: 11, color: '#9ca3af', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldValue: { fontSize: 13, color: '#111827', fontFamily: 'monospace' },
  fieldMono: { fontSize: 12, color: '#374151', fontFamily: 'monospace' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
  enrollRow: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  enrollText: { fontSize: 13, color: '#374151' },
  signOutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 6,
    padding: 13,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonDisabled: { backgroundColor: '#fca5a5' },
  signOutText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  subText: { color: '#6b7280', fontSize: 13 },
});
