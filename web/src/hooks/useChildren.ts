"use client";

/**
 * 보호자에게 연결된 자녀 목록 — guardianLinks(guardianUid) → students / campuses
 * 모바일 홈/내 정보 화면의 fetchChildren 과 동일한 조회 로직.
 * 체험 모드에서는 조회하지 않고 lib/demo.ts 의 고정 목록을 쓴다.
 */

import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { DEMO_CHILDREN } from "@/lib/demo";
import { useGuardianDemoData } from "@/hooks/useDemoExperience";
import { COL_GUARDIAN_LINKS } from "@/lib/collections";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

export interface Child {
  /** guardianLinks 문서 id */
  guardianLinkId: string;
  studentId: string;
  studentName: string;
  campusId: string;
  campusName: string;
  relation: string;
}

export function useChildren(opts?: { activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? false;
  const guardianDemo = useGuardianDemoData();
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid;

  const fetchChildren = useCallback(
    async (isRefresh = false) => {
      if (!uid) return;
      if (guardianDemo) {
        setChildren(DEMO_CHILDREN);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const db = getDb();
        const constraints = [where("guardianUid", "==", uid)];
        if (activeOnly) constraints.push(where("status", "==", "active"));
        const snap = await getDocs(query(collection(db, COL_GUARDIAN_LINKS), ...constraints));
        const list: Child[] = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const [sSnap, cSnap] = await Promise.all([
              getDoc(doc(db, "students", data.studentId)),
              getDoc(doc(db, "campuses", data.campusId)),
            ]);
            return {
              guardianLinkId: d.id,
              studentId: data.studentId,
              studentName: sSnap.exists() ? (sSnap.data()?.name ?? data.studentId) : data.studentId,
              campusId: data.campusId,
              campusName: cSnap.exists() ? (cSnap.data()?.name ?? data.campusId) : data.campusId,
              relation: data.guardianRelation ?? "",
            };
          }),
        );
        // 같은 학생이 중복 연결된 경우(등록코드 재사용 등) 한 번만, 이름순으로 정렬해 순서를 고정
        const unique = list.filter((c, i) => list.findIndex((x) => x.studentId === c.studentId) === i);
        unique.sort((a, b) => a.studentName.localeCompare(b.studentName, "ko"));
        setChildren(unique);
      } catch (e) {
        console.warn("자녀 목록 조회 실패:", (e as Error).message);
        setError((e as Error).message ?? "자녀 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid, activeOnly, guardianDemo],
  );

  useEffect(() => {
    if (uid) void fetchChildren();
  }, [uid, fetchChildren]);

  return { children, loading, refreshing, error, refresh: () => fetchChildren(true) };
}
