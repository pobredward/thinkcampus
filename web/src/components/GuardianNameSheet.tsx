"use client";

/**
 * 내 정보 — 보호자 이름 입력·수정 시트 (홈 인사말 "환영합니다, OOO 학부모님" 에 쓰임)
 * (모바일 app/main/(tabs)/profile/index.tsx 의 이름 시트와 같은 구성)
 */

import { useState } from "react";
import { guardianNameSaveError } from "@/components/GuardianNamePrompt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PrimaryButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { GUARDIAN_NAME_MAX, guardianNameError } from "@/lib/guardianName";

export function GuardianNameSheet({
  open,
  initialName,
  onClose,
  onSave,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<unknown>;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="보호자 이름">
      {/* 열 때마다 입력칸을 지금 이름으로 새로 채운다 */}
      {open && <NameForm initialName={initialName} onClose={onClose} onSave={onSave} />}
    </BottomSheet>
  );
}

function NameForm({
  initialName,
  onClose,
  onSave,
}: {
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState(initialName);
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
    <form
      className="pb-6"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="mb-4 text-[15px] leading-[22px] text-sub">홈에서 &quot;OOO 학부모님&quot;으로 인사드릴 때 쓰는 이름이에요.</p>
      <label htmlFor="guardian-name-edit" className="mb-2 block text-[15px] font-semibold text-fg2">
        이름
      </label>
      <TextField
        id="guardian-name-edit"
        autoComplete="name"
        placeholder="예: 홍길동"
        maxLength={GUARDIAN_NAME_MAX}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "guardian-name-edit-error" : undefined}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
      />
      {error && (
        <p id="guardian-name-edit-error" role="alert" className="mt-2 text-[15px] text-danger">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" loading={saving} disabled={!value.trim()} className="mt-5">
        저장
      </PrimaryButton>
      <button type="button" className="tap mt-[10px] flex w-full items-center justify-center py-[10px]" onClick={onClose}>
        <span className="text-[16px] text-sub">닫기</span>
      </button>
    </form>
  );
}
