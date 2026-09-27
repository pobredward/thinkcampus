/**
 * Cloud Functions 호출 — 함수 이름과 요청·응답 타입을 한 곳에서 고정한다
 */

import { httpsCallable } from "firebase/functions";
import { getFns } from "@/lib/firebase";

export async function call<Req, Res>(name: string, data: Req): Promise<Res> {
  // getFns() 는 브라우저에서 처음 쓰일 때 초기화되므로 모듈 최상위가 아닌 호출 시점에 만든다
  const fn = httpsCallable<Req, Res>(getFns(), name);
  const res = await fn(data);
  return res.data;
}
