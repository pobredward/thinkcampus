"use client";

/**
 * 홈 — 같은 householdId 의 미연결 형제 자녀 연동 (생년월일 확인)
 */

import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { formatBirth } from "@/lib/phone";
import { errMessage } from "@/lib/errors";
import { getFns } from "@/lib/firebase";
import type { PendingHouseholdMember } from "@/hooks/usePendingHousehold";

export function HouseholdLinkPrompt({
  pending,
  autoOpen,
  onLinked,
  onDismissBanner,
}: {
  pending: PendingHouseholdMember[];
  autoOpen?: boolean;
  onLinked: () => void;
  onDismissBanner?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PendingHouseholdMember | null>(null);
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpen && pending.length > 0) {
      setOpen(true);
      setTarget(pending[0]);
    }
  }, [autoOpen, pending]);

  if (pending.length === 0) return null;

  async function link() {
    if (!target || birthDate.length !== 8) {
      setError("생년월일 8자리를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ studentId: string; birthDate: string }, { linked: boolean }>(
        getFns(),
        "linkHouseholdMember",
      );
      await fn({ studentId: target.studentId, birthDate });
      setOpen(false);
      setBirthDate("");
      setTarget(null);
      onLinked();
    } catch (e) {
      setError(errMessage(e, "연결에 실패했어요. 생년월일을 확인해 주세요."));
    } finally {
      setLoading(false);
    }
  }

  const names = pending.map((p) => p.maskedName).join(", ");

  return (
    <>
      <section
        aria-labelledby="household-link-title"
        className="mx-4 mb-5 rounded-[18px] border border-gold-dim bg-card p-5"
      >
        <h2 id="household-link-title" className="text-[18px] font-bold leading-[26px] text-fg">
          같은 가구의 다른 자녀가 있어요
        </h2>
        <p className="mt-1 text-[15px] leading-[22px] text-sub">
          {names} 학생을 이 계정에 연결할 수 있습니다. 자녀 생년월일로 확인합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton type="button" onClick={() => { setOpen(true); setTarget(pending[0]); }}>
            연결하기
          </PrimaryButton>
          {onDismissBanner && (
            <button
              type="button"
              className="tap rounded-full px-4 py-3 text-[16px] font-semibold text-sub"
              onClick={onDismissBanner}
            >
              나중에
            </button>
          )}
        </div>
      </section>

      {open && target && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="household-modal-title"
        >
          <div className="w-full max-w-md rounded-[20px] bg-card p-6 shadow-lg">
            <h3 id="household-modal-title" className="text-[20px] font-bold text-fg">
              {target.maskedName} 학생 연결
            </h3>
            <p className="mt-2 text-[15px] text-sub">자녀 생년월일(8자리)을 입력해 주세요.</p>
            {pending.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pending.map((p) => (
                  <button
                    key={p.studentId}
                    type="button"
                    className={`tap rounded-full border px-3 py-1.5 text-[14px] ${
                      p.studentId === target.studentId ? "border-gold bg-gold/10 font-semibold" : "border-line"
                    }`}
                    onClick={() => {
                      setTarget(p);
                      setBirthDate("");
                      setError(null);
                    }}
                  >
                    {p.maskedName}
                  </button>
                ))}
              </div>
            )}
            <label className="mt-4 block text-[15px] font-semibold text-fg2" htmlFor="hh-birth">
              생년월일
            </label>
            <TextField
              id="hh-birth"
              inputMode="numeric"
              autoComplete="bday"
              placeholder="YYYYMMDD"
              value={formatBirth(birthDate)}
              onChange={(e) => setBirthDate(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="mt-2"
            />
            {error && <p className="mt-2 text-[14px] text-danger">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="tap flex-1 rounded-full border border-line py-3 text-[16px] font-semibold"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                  setBirthDate("");
                }}
              >
                취소
              </button>
              <PrimaryButton type="button" className="flex-1" loading={loading} onClick={() => void link()}>
                연결
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
