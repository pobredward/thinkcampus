/**
 * 실서비스 · 채팅 실시간 — chatRooms 문서가 바뀌면(새 메시지 · 읽음) onChange
 * 메시지 본문은 Callable(getChatRoom)로 다시 읽는다 — 이름 · 민원 상태를 서버가 붙여 주기 때문.
 * 보안 규칙: 학부모는 guardianUids 에 자기 uid 가 있는 방, 캠퍼스 직원은 자기 캠퍼스 방만 읽는다.
 */

import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "@/lib/firebase";

export function watchChatLive(
  target: { roomId?: string; programRunId?: string; campusId?: string; guardian?: boolean },
  onChange: () => void,
): () => void {
  try {
    const db = getDb();
    let first = true;
    const fire = () => {
      // 구독을 붙일 때 한 번 오는 현재 상태는 건너뛴다 (화면은 이미 읽어 왔다)
      if (first) {
        first = false;
        return;
      }
      onChange();
    };
    const onError = () => {
      /* 권한 · 네트워크 오류 — 실시간만 멈추고 화면은 그대로 */
    };
    if (target.roomId) return onSnapshot(doc(db, "chatRooms", target.roomId), fire, onError);
    if (target.guardian) {
      const uid = getFirebaseAuth().currentUser?.uid;
      if (!uid) return () => {};
      return onSnapshot(query(collection(db, "chatRooms"), where("guardianUids", "array-contains", uid)), fire, onError);
    }
    if (target.programRunId && target.campusId) {
      return onSnapshot(
        query(collection(db, "chatRooms"), where("campusId", "==", target.campusId), where("programRunId", "==", target.programRunId)),
        fire,
        onError,
      );
    }
  } catch {
    /* Firebase 설정 전 */
  }
  return () => {};
}
