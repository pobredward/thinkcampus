/**
 * 보호자에게 연결된 자녀 목록 — enrollments(guardianUid) → students / campuses
 * (홈 · 내 정보 · 회원 탈퇴 화면이 함께 사용. 웹 web/src/hooks/useChildren.ts 와 같은 로직)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from '@react-native-firebase/firestore';
import { db } from '../firebase';
import { useAuthUser } from './useAuthUser';

export interface Child {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  campusId: string;
  campusName: string;
  relation: string;
}

export function useChildren(opts?: { activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? false;
  const user = useAuthUser();
  const uid = user?.uid;
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(
    async (isRefresh = false) => {
      if (!uid) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const base = collection(db, 'enrollments');
        const q = activeOnly
          ? query(base, where('guardianUid', '==', uid), where('status', '==', 'active'))
          : query(base, where('guardianUid', '==', uid));
        const snap = await getDocs(q);
        const list: Child[] = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const [sSnap, cSnap] = await Promise.all([
              getDoc(doc(db, 'students', data.studentId)),
              getDoc(doc(db, 'campuses', data.campusId)),
            ]);
            return {
              enrollmentId: d.id,
              studentId: data.studentId,
              studentName: sSnap.exists ? (sSnap.data()?.name ?? data.studentId) : data.studentId,
              campusId: data.campusId,
              campusName: cSnap.exists ? (cSnap.data()?.name ?? data.campusId) : data.campusId,
              relation: data.guardianRelation ?? '',
            };
          }),
        );
        // 같은 학생이 중복 연결된 경우 한 번만, 이름순으로 정렬해 순서를 고정
        const unique = list.filter((c, i) => list.findIndex((x) => x.studentId === c.studentId) === i);
        unique.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));
        setChildren(unique);
      } catch (e) {
        console.warn('자녀 목록 조회 실패:', (e as Error).message);
        setError((e as Error).message ?? '자녀 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid, activeOnly],
  );

  useEffect(() => {
    if (uid) void fetchChildren();
  }, [uid, fetchChildren]);

  return { user, children, loading, refreshing, error, refresh: () => fetchChildren(true) };
}
