"use client";

/**
 * 회차 화면 — 프로그램 내용 탭 (수업 소개 · 목표 · 교수 방법 · 강사 · 수업자료)
 * (예전 /main/program/session/[sessionId] 화면의 내용)
 */

import type { Session } from "@/data/dummyProgram";
import { useDialog } from "@/providers/DialogProvider";
import { Bullets, Card, PanelTitle } from "./parts";

export function ContentPanel({ session }: { session: Session }) {
  const dialog = useDialog();

  function openUrl(url: string) {
    // http(s) 링크만 새 탭으로 연다
    if (/^https?:\/\//i.test(url)) window.open(url, "_blank", "noopener,noreferrer");
    else void dialog.alert("오류", "링크를 열 수 없습니다.");
  }

  const hasMaterials = (session.lessonPlans?.length ?? 0) > 0 || !!session.planUrl;

  return (
    <>
      <PanelTitle>프로그램 내용</PanelTitle>

      <Card title="수업 소개" icon="📖">
        {session.programCode && (
          <p className="mb-3">
            <span className="rounded-lg border border-blue-200 bg-brand-light px-[10px] py-1 text-[15px] font-bold text-brand">
              {session.programCode}
            </span>
          </p>
        )}
        <p className="text-[17px] leading-[27px] text-gray-800">{session.description}</p>
        {session.rotationNote && (
          <p className="mt-3 text-[15px] leading-[23px] text-gray-600">{session.rotationNote}</p>
        )}
      </Card>

      {session.objectives && session.objectives.length > 0 && (
        <Card title="수업 목표" icon="🎯">
          <Bullets items={session.objectives} color="#1d4ed8" />
        </Card>
      )}

      {session.teachingMethod && (
        <Card title="이렇게 가르쳐요" icon="🧩">
          <p className="text-[16px] leading-[26px] text-gray-800">{session.teachingMethod}</p>
        </Card>
      )}

      <Card title="강사 소개" icon="🧑‍🏫">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[22px] font-bold text-brand">
            {session.instructor.name.charAt(0)}
          </span>
          <div className="min-w-0">
            <p className="text-[18px] font-bold text-gray-900">{session.instructor.name} 강사</p>
            <p className="text-[15px] text-gray-600">{session.instructor.title}</p>
          </div>
        </div>
        <p className="mt-3 text-[16px] leading-[25px] text-gray-800">{session.instructor.bio}</p>
      </Card>

      {hasMaterials && (
        <Card title="수업 자료" icon="📂">
          {session.planUrl && (
            <LinkButton onClick={() => openUrl(session.planUrl!)} tone="blue">
              📋 전체 수업 계획서
            </LinkButton>
          )}
          {session.lessonPlans?.map(({ lessonNumber, topic, slideUrl, activityUrl }) => (
            <div key={lessonNumber} className="mt-4 border-t border-gray-100 pt-4 first:mt-0 first:border-t-0 first:pt-0">
              <p className="text-[15px] font-bold text-brand">{lessonNumber}차시</p>
              <p className="mb-2 text-[17px] font-semibold text-gray-900">{topic}</p>
              <div className="flex flex-wrap gap-2">
                {slideUrl && (
                  <LinkButton onClick={() => openUrl(slideUrl)} tone="blue">
                    🖥 수업 PPT
                  </LinkButton>
                )}
                {activityUrl && (
                  <LinkButton onClick={() => openUrl(activityUrl)} tone="green">
                    📝 활동지
                  </LinkButton>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

function LinkButton({
  onClick,
  tone,
  children,
}: {
  onClick: () => void;
  tone: "blue" | "green";
  children: React.ReactNode;
}) {
  const cls =
    tone === "blue" ? "border-blue-200 bg-brand-light text-brand" : "border-green-200 bg-green-50 text-green-700";
  return (
    <button type="button" onClick={onClick} className={`tap rounded-xl border px-4 py-[9px] text-[16px] font-semibold ${cls}`}>
      {children}
    </button>
  );
}
