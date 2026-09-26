"use client";

import type { InstructorLessonMaterial } from "@/lib/demoInstructor";

function open(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function LinkRow({ label, url }: { label: string; url?: string }) {
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={() => open(url)}
      className="tap flex w-full items-center justify-between rounded-lg border border-line bg-elev px-3 py-2.5 text-left text-[14px]"
    >
      <span className="text-fg">{label}</span>
      <span className="text-gold text-[13px] font-semibold">열기 ↗</span>
    </button>
  );
}

export function InstructorMaterialLinks({ materials }: { materials: InstructorLessonMaterial[] }) {
  if (materials.length === 0) {
    return <p className="text-sm text-sub">이 회차에 등록된 차시 자료가 없습니다.</p>;
  }

  return (
    <ul className="space-y-4">
      {materials.map((m) => (
        <li key={m.lessonCode} className="rounded-[16px] border border-line bg-card p-4">
          <p className="text-[12px] font-semibold text-gold">{m.lessonCode}</p>
          <p className="mt-1 text-[16px] font-bold text-fg">{m.title}</p>
          <div className="mt-3 flex flex-col gap-2">
            <LinkRow label="교수·학습 계획서" url={m.planUrl} />
            <LinkRow label="수업 PPT (공개 보기)" url={m.slideViewUrl} />
            <LinkRow label="수업 PPT (Canva 템플릿)" url={m.slideTemplateUrl} />
            <LinkRow label="활동지" url={m.activityUrl} />
          </div>
        </li>
      ))}
    </ul>
  );
}
