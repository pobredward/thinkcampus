"use client";

/**
 * 홈 — 보호자 이름이 없는 계정에 한 번 묻는 카드 (예전에 가입했거나 초대받아 로그인한 보호자)
 *
 *   학부모님 성함을 알려 주세요
 *   [보호자 이름 ____________]
 *   [나중에]  [저장]
 *
 * 저장하면 인사말이 바로 "환영합니다, OOO 학부모님" 으로 바뀐다.
 * [나중에]를 누르면 이 기기에서는 다시 묻지 않는다 (내 정보에서 언제든 입력).
 * (모바일 components/GuardianNamePrompt.tsx 와 같은 구성)
 */

import { useState } from "react";
import { PrimaryButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { errCode, errMessage } from "@/lib/errors";
import { GUARDIAN_NAME_MAX, guardianNameError } from "@/lib/guardianName";

/** 저장 실패 문구 — 입력 확인 문구는 그대로, Firebase 오류는 알기 쉬운 말로 */
export function guardianNameSaveError(e: unknown): string {
  if (e instanceof Error && !errCode(e)) return e.message;
  return errMessage(e, "이름을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
}

export function GuardianNamePrompt({
  onSave,
  onLater,
}: {
  onSave: (name: string) => Promise<unknown>;
  onLater: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    const invalid = guardianNameError(value);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(value);
    } catch (e) {
      setError(guardianNameSaveError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="guardian-name-title"
      className="mx-4 mb-5 rounded-[18px] border border-gold-dim bg-card p-5"
    >
      <h2 id="guardian-name-title" className="text-[18px] font-bold leading-[26px] text-fg">
        학부모님 성함을 알려 주세요
      </h2>
      <p className="mt-1 text-[15px] leading-[22px] text-sub">
        홈에서 이름으로 인사드려요. 내 정보에서 언제든 바꿀 수 있어요.
      </p>
      <form
        className="mt-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor="guardian-name" className="mb-2 block text-[15px] font-semibold text-fg2">
          보호자 이름
        </label>
        <TextField
          id="guardian-name"
          autoComplete="name"
          placeholder="예: 홍길동"
          maxLength={GUARDIAN_NAME_MAX}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "guardian-name-error" : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
        />
        {error && (
          <p id="guardian-name-error" role="alert" className="mt-2 text-[15px] text-danger">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onLater}
            className="tap flex flex-1 items-center justify-center rounded-xl border border-line2 bg-elev py-4 text-[17px] font-semibold text-fg2"
          >
            나중에
          </button>
          <PrimaryButton type="submit" loading={saving} disabled={!value.trim()} className="flex-[2]">
            저장
          </PrimaryButton>
        </div>
      </form>
    </section>
  );
}
