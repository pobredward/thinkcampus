"use client";

/**
 * 회원 탈퇴 — 내 정보 맨 아래 "회원 탈퇴"에서 진입
 *
 *   안내(무엇이 사라지는지) → [확인했어요] 체크 → [회원 탈퇴하기] → 한 번 더 확인
 *   → deleteAccount (Cloud Function: 내 연결 정보 정리 + 로그인 계정 삭제)
 *   → signOut("withdrawn") → 인증 가드가 /goodbye 로 이동
 *
 * 스토어 정책(앱 안에서 계정 삭제 가능, 웹에서 삭제 요청 가능)을 겸하는 화면.
 */

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Spinner } from "@/components/ui/Spinner";
import { useBack } from "@/hooks/useBack";
import { useChildren } from "@/hooks/useChildren";
import { usePageTitle } from "@/hooks/usePageTitle";
import { clearSelectedChild } from "@/hooks/useSelectedChild";
import { CALL_CENTER_PHONE } from "@/lib/contact";
import { DEMO_BLOCKED, DEMO_MODE, DEMO_NOTICE_TITLE } from "@/lib/demo";
import { errMessage } from "@/lib/errors";
import { getFns } from "@/lib/firebase";
import { e164ToLocal } from "@/lib/phone";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function WithdrawPage() {
  usePageTitle("회원 탈퇴");
  const goBack = useBack("/main/profile");
  const dialog = useDialog();
  const { user, signOut } = useAuth();
  const { children, loading } = useChildren();
  const [agreed, setAgreed] = useState(false);
  const [working, setWorking] = useState(false);

  const phone = e164ToLocal(user?.phoneNumber);
  const childNames = [...new Set(children.map((c) => c.studentName))];

  async function handleWithdraw() {
    if (!agreed || working || !user) return;
    const ok = await dialog.confirm("정말 탈퇴할까요?", "탈퇴하면 되돌릴 수 없어요.", {
      confirmText: "탈퇴",
      cancelText: "취소",
      destructive: true,
    });
    if (!ok) return;
    if (DEMO_MODE) {
      void dialog.alert(DEMO_NOTICE_TITLE, DEMO_BLOCKED.withdraw);
      return;
    }

    setWorking(true);
    const uid = user.uid;
    try {
      const fn = httpsCallable<{ confirm: boolean }, { deleted: boolean }>(getFns(), "deleteAccount");
      await fn({ confirm: true });
    } catch (e) {
      setWorking(false);
      void dialog.alert(
        "탈퇴하지 못했어요",
        errMessage(e, `잠시 후 다시 시도해 주세요. 계속 안 되면 ${CALL_CENTER_PHONE} 로 연락해 주세요.`),
      );
      return;
    }
    clearSelectedChild(uid);
    try {
      await signOut("withdrawn"); // 이동은 main/layout 인증 가드가 /goodbye 로
    } catch {
      // 계정은 이미 삭제됨 — 로컬 로그아웃 실패는 무시하고 안내 화면으로
      window.location.replace("/goodbye");
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10">
      <header className="border-b border-line bg-paper px-5 pb-4" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs items={[{ label: "내 정보", href: "/main/profile" }, { label: "회원 탈퇴" }]} />
        <h1 className="mt-1 text-[24px] font-bold text-fg">회원 탈퇴</h1>
      </header>

      <section className="mx-5 mt-5 rounded-[20px] border border-line bg-card p-5">
        <h2 className="mb-4 text-[18px] font-bold text-fg">탈퇴하면 이렇게 돼요</h2>
        <ul className="flex flex-col gap-4">
          <Item>
            {loading ? (
              "연결된 자녀의 출결·수업·리포트를 더 이상 볼 수 없어요."
            ) : childNames.length > 0 ? (
              <>
                <b>{childNames.join(", ")}</b> 학생의 출결·수업·리포트를 더 이상 볼 수 없어요.
              </>
            ) : (
              "연결된 자녀 정보가 모두 해제돼요."
            )}
          </Item>
          <Item>내가 보낸 리포트 공유 링크가 바로 사용 중지돼요.</Item>
          <Item>
            로그인 정보{phone ? <> (<b>{phone}</b>)</> : null}가 삭제되고, <b>되돌릴 수 없어요.</b>
          </Item>
          <Item>
            다시 이용하려면 캠퍼스에서 등록코드를 새로 받거나, 다른 보호자에게 초대를 받아야 해요.
          </Item>
        </ul>
        <p className="mt-5 rounded-2xl bg-elev px-4 py-3 text-[15px] leading-[23px] text-sub">
          자녀의 수업 기록은 캠퍼스 운영 자료라 삭제되지 않아요. 다른 보호자는 계속 볼 수 있어요.
        </p>
      </section>

      <label className="tap mx-5 mt-4 flex cursor-pointer items-center gap-3 rounded-[20px] border border-line bg-card px-5 py-4">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-red-600"
        />
        <span className="text-[17px] font-semibold text-fg">위 내용을 모두 확인했어요</span>
      </label>

      <div className="mx-5 mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void handleWithdraw()}
          disabled={!agreed || working}
          className={`tap flex items-center justify-center rounded-2xl py-4 text-[17px] font-bold ${
            agreed && !working ? "bg-danger text-ink" : "bg-danger-bg text-danger"
          }`}
        >
          {working ? <Spinner color="#0c0e13" /> : "회원 탈퇴하기"}
        </button>
        <button
          type="button"
          onClick={goBack}
          disabled={working}
          className="tap rounded-2xl py-4 text-center text-[17px] font-semibold text-sub"
        >
          취소
        </button>
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="mt-[11px] h-1 w-1 shrink-0 rounded-full bg-gold" />
      <span className="flex-1 text-[16px] leading-[26px] text-fg2">{children}</span>
    </li>
  );
}
