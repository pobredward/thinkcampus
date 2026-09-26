"use client";

/**
 * 내 정보 탭 (모바일 app/main/(tabs)/profile/index.tsx)
 * - 보호자 정보 확인 — 이름(홈 인사말에 쓰임, [이름 수정]) · 전화번호
 * - 자녀 목록 + 보호자 초대
 * - 로그아웃 · 회원 탈퇴(/main/profile/withdraw)
 */

import { useCallback, useState } from "react";
import Link from "next/link";
import { httpsCallable } from "firebase/functions";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Spinner } from "@/components/ui/Spinner";
import { TextField } from "@/components/ui/TextField";
import { useChildren } from "@/hooks/useChildren";
import { usePageTitle } from "@/hooks/usePageTitle";
import { GuardianNameSheet } from "@/components/GuardianNameSheet";
import { errMessage } from "@/lib/errors";
import { getFns } from "@/lib/firebase";
import { DEMO_BLOCKED, DEMO_MODE, DEMO_NOTICE_TITLE } from "@/lib/demo";
import { e164ToLocal } from "@/lib/phone";
import { useAuth } from "@/providers/AuthProvider";
import { useDialog } from "@/providers/DialogProvider";
import { useToast } from "@/providers/ToastProvider";

const RELATION_PRESETS = ["부(아빠)", "조모(할머니)", "조부(할아버지)", "이모", "삼촌", "기타"];

export default function ProfileScreen() {
  usePageTitle("내 정보");
  const dialog = useDialog();
  const toast = useToast();
  const { user, signOut, guardianName, saveGuardianName } = useAuth();
  const [nameSheet, setNameSheet] = useState(false);
  const { children, loading } = useChildren({ activeOnly: true });
  const [signingOut, setSigningOut] = useState(false);

  // 초대 모달
  const [inviteModal, setInviteModal] = useState<{
    visible: boolean;
    studentId: string;
    studentName: string;
  }>({ visible: false, studentId: "", studentName: "" });
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRelation, setInviteRelation] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const closeInviteModal = useCallback(() => {
    setInviteModal((m) => ({ ...m, visible: false }));
  }, []);

  function handleSignOut() {
    if (DEMO_MODE) {
      void dialog.alert(DEMO_NOTICE_TITLE, DEMO_BLOCKED.signOut);
      return;
    }
    void dialog.alert("로그아웃", "정말 로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            // 이동은 main/layout.tsx 인증 가드가 /onboarding 으로 처리
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  async function handleInvite() {
    if (invitePhone.replace(/\D/g, "").length < 10) {
      void dialog.alert("확인", "올바른 전화번호를 입력해주세요.");
      return;
    }
    if (!inviteRelation.trim()) {
      void dialog.alert("확인", "관계를 선택하거나 입력해주세요.");
      return;
    }
    if (DEMO_MODE) {
      void dialog.alert(DEMO_NOTICE_TITLE, DEMO_BLOCKED.invite);
      return;
    }
    setInviteLoading(true);
    try {
      const fn = httpsCallable<{ studentId: string; phone: string; relation: string }, unknown>(
        getFns(),
        "addGuardianPhone",
      );
      await fn({
        studentId: inviteModal.studentId,
        phone: invitePhone.trim(),
        relation: inviteRelation.trim(),
      });
      void dialog.alert(
        "초대 완료",
        `${invitePhone} 번호를 추가했습니다.\n해당 번호로 앱에 로그인하면 자동으로 연결됩니다.`,
        [{ text: "확인", onPress: closeInviteModal }],
      );
      setInvitePhone("");
      setInviteRelation("");
    } catch (e) {
      void dialog.alert("오류", errMessage(e, "오류가 발생했습니다."));
    } finally {
      setInviteLoading(false);
    }
  }

  const formattedPhone = e164ToLocal(user?.phoneNumber);

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10">
      {/* 헤더 */}
      <div
        className="border-b border-line bg-paper px-5 pb-4"
        style={{ paddingTop: "calc(var(--sat) + 20px)" }}
      >
        <h1 className="text-[24px] font-bold text-fg">내 정보</h1>
      </div>

      {/* 보호자 정보 카드 — 이름(없으면 입력 안내) · 전화번호 · [이름 수정] */}
      <div className="mx-5 mt-4 flex items-center gap-[14px] rounded-[14px] border border-line bg-card p-4">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[26px] bg-elev">
          <span className="text-[14px] font-semibold text-gold">보호자</span>
        </div>
        <div className="min-w-0 flex-1">
          {guardianName ? (
            <p className="truncate text-[20px] font-bold text-fg">{guardianName}</p>
          ) : (
            <p className="text-[17px] font-semibold text-sub">이름을 입력해 주세요</p>
          )}
          <p className="mt-[2px] text-[15px] text-sub">{formattedPhone}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (DEMO_MODE) {
              void dialog.alert(DEMO_NOTICE_TITLE, DEMO_BLOCKED.guardianName);
              return;
            }
            setNameSheet(true);
          }}
          className="tap shrink-0 rounded-lg border border-line bg-elev px-3 py-[9px]"
        >
          <span className="text-[15px] font-semibold text-gold">{guardianName ? "이름 수정" : "이름 입력"}</span>
        </button>
      </div>

      {/* 자녀 목록 */}
      <h2 className="px-5 pb-2 pt-5 text-[15px] font-semibold uppercase tracking-[0.5px] text-sub">
        연결된 자녀
      </h2>

      {loading ? (
        <div className="mt-4 flex justify-center">
          <Spinner />
        </div>
      ) : children.length === 0 ? (
        <div className="mx-5 flex flex-col items-center rounded-[14px] border border-line bg-card p-5">
          <p className="text-[16px] text-sub">연결된 자녀가 없습니다</p>
        </div>
      ) : (
        children.map((child) => (
          <div
            key={child.guardianLinkId}
            className="mx-5 mb-2 flex items-center justify-between rounded-[14px] border border-line bg-card p-4"
          >
            <div>
              <p className="text-[16px] font-bold text-fg">{child.studentName}</p>
              <p className="mt-[3px] text-[14px] text-sub">
                {child.campusName}
                {child.relation ? ` · ${child.relation}` : ""}
              </p>
            </div>
            <button
              type="button"
              className="tap shrink-0 rounded-lg border border-line bg-elev px-3 py-[7px]"
              onClick={() => {
                setInvitePhone("");
                setInviteRelation("");
                setInviteModal({
                  visible: true,
                  studentId: child.studentId,
                  studentName: child.studentName,
                });
              }}
            >
              <span className="text-[14px] font-semibold text-gold">보호자 초대</span>
            </button>
          </div>
        ))
      )}

      {/* 메뉴 */}
      <h2 className="mt-6 px-5 pb-2 pt-5 text-[15px] font-semibold uppercase tracking-[0.5px] text-sub">
        설정
      </h2>
      <div className="mx-5 overflow-hidden rounded-[14px] border border-line bg-card">
        <button
          type="button"
          className="tap flex w-full items-center justify-between px-4 py-[14px] text-left"
        >
          <span className="text-[16px] text-fg">앱 정보</span>
          <span className="text-[20px] text-sub">›</span>
        </button>
        <div className="mx-4 h-px bg-elev" />
        <button
          type="button"
          className="tap flex w-full items-center justify-between px-4 py-[14px] text-left"
        >
          <span className="text-[16px] text-fg">문의하기</span>
          <span className="text-[20px] text-sub">›</span>
        </button>
        <div className="mx-4 h-px bg-elev" />
        <button
          type="button"
          className="tap flex w-full items-center justify-between px-4 py-[14px] text-left"
        >
          <span className="text-[16px] text-fg">개인정보 처리방침</span>
          <span className="text-[20px] text-sub">›</span>
        </button>
      </div>

      {/* 로그아웃 */}
      <button
        type="button"
        className={`tap mx-5 mt-5 flex items-center justify-center rounded-[14px] border border-danger-border bg-danger-bg py-[15px] ${
          signingOut ? "opacity-50" : ""
        }`}
        onClick={handleSignOut}
        disabled={signingOut}
      >
        {signingOut ? (
          <Spinner color="#dc2626" />
        ) : (
          <span className="text-[16px] font-semibold text-danger">로그아웃</span>
        )}
      </button>

      {/* 회원 탈퇴 — 눈에 덜 띄게 */}
      <Link
        href="/main/profile/withdraw"
        className="tap mx-auto mt-6 px-4 py-2 text-[15px] text-sub underline underline-offset-4"
      >
        회원 탈퇴
      </Link>

      {/* 보호자 이름 입력·수정 */}
      <GuardianNameSheet
        open={nameSheet}
        initialName={guardianName ?? ""}
        onClose={() => setNameSheet(false)}
        onSave={async (raw) => {
          await saveGuardianName(raw);
          setNameSheet(false);
          toast.show("이름을 저장했어요");
        }}
      />

      {/* 보호자 초대 모달 */}
      <BottomSheet open={inviteModal.visible} onClose={closeInviteModal} title="보호자 초대">
        <div className="pb-6">
          <p className="mb-5 text-[15px] leading-[22px] text-sub">
            <span className="font-bold text-fg">{inviteModal.studentName}</span>
            {"의 다른 보호자를 초대합니다."}
            <br />
            추가된 번호로 앱에 로그인하면 자동으로 연결됩니다.
          </p>

          <p className="mb-2 text-[15px] font-semibold text-fg2">관계</p>
          <div className="mb-[10px] flex flex-wrap gap-2" role="group" aria-label="관계 선택">
            {RELATION_PRESETS.map((r) => {
              const active = inviteRelation === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setInviteRelation(r)}
                  className={`tap rounded-[20px] border px-3 py-[6px] text-[15px] ${
                    active
                      ? "border-gold bg-elev font-semibold text-gold"
                      : "border-line bg-elev text-fg2"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <TextField
            aria-label="관계 직접 입력"
            placeholder="직접 입력 (예: 외조모, 고모)"
            value={inviteRelation}
            onChange={(e) => setInviteRelation(e.target.value)}
            className="mb-[14px] py-3!"
          />

          <label htmlFor="invite-phone" className="mb-2 block text-[15px] font-semibold text-fg2">
            전화번호
          </label>
          <TextField
            id="invite-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder="01012345678"
            maxLength={11}
            value={invitePhone}
            onChange={(e) => setInvitePhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            className="mb-[14px] py-3!"
          />

          <button
            type="button"
            className={`tap mb-[10px] flex w-full items-center justify-center rounded-xl bg-brand py-[15px] ${
              inviteLoading ? "opacity-50" : ""
            }`}
            onClick={() => void handleInvite()}
            disabled={inviteLoading}
          >
            {inviteLoading ? (
              <Spinner color="#0c0e13" />
            ) : (
              <span className="text-[16px] font-bold text-ink">초대 추가</span>
            )}
          </button>
          <button
            type="button"
            className="tap flex w-full items-center justify-center py-[10px]"
            onClick={closeInviteModal}
          >
            <span className="text-[16px] text-sub">닫기</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
