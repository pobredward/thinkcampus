"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { PrimaryButton } from "@/components/ui/Button";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCenterSummary } from "@/hooks/useCenterSummary";
import { DEMO_CENTER_NOTIFICATIONS } from "@/lib/demoCenterOps";
import { useCenterRun } from "@/providers/CenterRunProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";
import { getFns } from "@/lib/firebase";
import { Spinner } from "@/components/ui/Spinner";

export default function CenterCommsPage() {
  usePageTitle("소통");
  const { selectedRun } = useCenterRun();
  const hasRun = Boolean(selectedRun);
  const { role, active } = useDemoPortal();
  const isDemo = active && role === "center";
  const { loading, error } = useCenterSummary(selectedRun?.id);
  const items = isDemo ? DEMO_CENTER_NOTIFICATIONS : [];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submitNotice(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo || !selectedRun) return;
    const t = title.trim();
    if (!t) {
      setFormError("제목을 입력하세요.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const fn = httpsCallable<
        { programRunId: string; title: string; body?: string },
        { notificationId: string }
      >(getFns(), "createCenterNotice");
      await fn({ programRunId: selectedRun.id, title: t, body: body.trim() || undefined });
      setTitle("");
      setBody("");
      // 목록은 notifications API 분리 전까지 페이지 새로고침으로 갱신
      window.location.reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[20px] font-bold text-fg">소통</h2>
        <p className="mt-1 text-sm text-sub">
          {selectedRun
            ? `${selectedRun.contractCode} 공지·알림 이력`
            : "운영 건 공지와 발송 이력"}
        </p>
      </div>

      {isDemo ? (
        <p className="rounded-xl border border-dashed border-line bg-elev px-4 py-3 text-sm text-sub">
          체험판에서는 공지 작성이 비활성화됩니다. 로그인 센터 계정에서 작성할 수 있습니다.
        </p>
      ) : (
        <form onSubmit={submitNotice} className="space-y-3 rounded-[18px] border border-line bg-card p-4">
          <h3 className="text-[15px] font-bold text-fg">공지 작성</h3>
          <input
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[15px]"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            disabled={!hasRun || saving}
          />
          <textarea
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-[15px]"
            placeholder="내용 (선택)"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={!hasRun || saving}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <PrimaryButton type="submit" disabled={!hasRun || saving}>
            {saving ? "저장 중…" : "공지 등록"}
          </PrimaryButton>
        </form>
      )}

      <section>
        <h3 className="text-[15px] font-bold text-fg">발송 이력</h3>
        {loading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {!loading && hasRun && items.length === 0 && (
          <p className="mt-2 rounded-xl border border-line bg-elev px-4 py-8 text-center text-sub">
            이력이 없습니다.
          </p>
        )}
        {!loading && items.length > 0 && (
          <ul className="mt-2 space-y-2">
            {items.map((n) => (
              <li key={n.id} className="rounded-xl border border-line bg-card px-4 py-3">
                <p className="font-medium text-fg">{n.title}</p>
                <p className="mt-1 text-sm text-sub">{n.sentAt} · {n.channel}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
