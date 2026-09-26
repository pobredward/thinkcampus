/**
 * 체험 모드 (임시 공개 페이지용)
 *
 * 등록코드·전화 인증 없이 바로 메인 화면을 보여 준다. 보이는 계정은 010-7656-7933 (보호자 신선웅 · 달성캠퍼스, 자녀 신민준 · 신서연).
 * Firebase 에 접속하지 않는다 — 로그인·자녀 조회는 아래 고정값, 보호자 초대·회원 탈퇴·로그아웃은 막고 안내만 띄운다.
 *
 *   켜기/끄기: NEXT_PUBLIC_DEMO_MODE=1 / 0
 *   값이 없으면 꺼짐 — 공개 체험은 `/demo` 경로 사용
 *   → 실제 서비스로 전환할 때 Vercel 환경변수에 NEXT_PUBLIC_DEMO_MODE=0 을 넣고 다시 배포
 *
 * 자녀 목록은 운영 DB 에서 010-7656-7933 계정에 연결된 값(2026-09-17 기준)을 옮겨 두고, 이름만 체험용으로 바꿨다.
 */

import type { User } from "firebase/auth";
import type { Child } from "@/hooks/useChildren";

const flag = process.env.NEXT_PUBLIC_DEMO_MODE;

/** 전역 체험 모드(레거시). 신규 체험은 `/demo/*` 사용 — 기본값 꺼짐 */
export const DEMO_MODE: boolean = flag === "1";

export const DEMO_PHONE_E164 = "+821076567933";

/** 체험용 보호자 이름 (홈 인사말 · 내 정보) */
export const DEMO_GUARDIAN_NAME = "신선웅";

/** 체험용 보호자 — 화면에서 쓰는 uid · phoneNumber · displayName 만 채운다 */
export const DEMO_USER = {
  uid: "demo-guardian-01076567933",
  phoneNumber: DEMO_PHONE_E164,
  displayName: DEMO_GUARDIAN_NAME,
  isAnonymous: false,
  providerData: [],
} as unknown as User;

export const DEMO_CHILDREN: Child[] = [
  {
    guardianLinkId: "demo-guardian-link-1",
    studentId: "student-001",
    studentName: "신민준",
    campusId: "campus-ds26",
    campusName: "달성캠퍼스",
    relation: "부(아빠)",
  },
  {
    guardianLinkId: "demo-guardian-link-2",
    studentId: "student-002",
    studentName: "신서연",
    campusId: "campus-ds26",
    campusName: "달성캠퍼스",
    relation: "부(아빠)",
  },
];

export const DEMO_NOTICE_TITLE = "체험용 화면이에요";

/** 체험 모드에서 막는 동작별 안내 문구 */
export const DEMO_BLOCKED = {
  signOut: "체험용 화면에서는 로그아웃할 수 없어요.",
  invite: "체험용 화면에서는 보호자를 초대할 수 없어요.\n실제 앱에서는 입력한 번호로 로그인하면 자녀가 자동으로 연결돼요.",
  withdraw: "체험용 계정은 탈퇴할 수 없어요.\n실제 앱에서는 이 버튼으로 계정과 연결 정보가 삭제돼요.",
  guardianName: "체험용 화면에서는 이름을 바꿀 수 없어요.\n실제 앱에서는 여기서 바꾼 이름이 홈 인사말에 바로 보여요.",
} as const;

/** 체험 모드 알림 문구의 학생 이름 — 더미 알림(김민준 기준)을 체험용 첫째 자녀 이름으로 */
export function demoStudentText(text: string): string {
  return DEMO_MODE ? text.replaceAll("김민준", DEMO_CHILDREN[0].studentName) : text;
}
