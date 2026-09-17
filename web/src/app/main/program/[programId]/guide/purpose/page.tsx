"use client";

/**
 * 프로그램 안내 — 프로그램 목적 (도입 취지 · 어떤 수업인지 · 대상)
 * /main/program/[programId]/guide/purpose
 */

import { GuidePage } from "@/components/program/GuidePage";
import { Bullets, Card, InfoRow } from "@/components/program/session/parts";
import type { Program } from "@/data/dummyProgram";
import { instructorNames } from "@/data/programView";

export default function GuidePurposePage() {
  return <GuidePage section="purpose">{({ program }) => <PurposeSection program={program} />}</GuidePage>;
}

function PurposeSection({ program }: { program: Program }) {
  const teachers = instructorNames(program);
  return (
    <>
      {program.purpose && (
        <Card title="왜 운영하나요?" icon="🏛">
          <p className="text-[17px] leading-[27px] text-gray-800">{program.purpose}</p>
          {program.host && <p className="mt-3 text-[15px] text-gray-600">주최·운영 · {program.host}</p>}
        </Card>
      )}
      {!!(program.overview || program.features?.length) && (
        <Card title="어떤 수업인가요?" icon="📖">
          {program.overview && <p className="text-[17px] leading-[27px] text-gray-800">{program.overview}</p>}
          {!!program.features?.length && (
            <div className="mt-4 rounded-2xl bg-brand-light p-4">
              <p className="mb-2 text-[16px] font-bold text-brand">이런 점이 좋아요</p>
              <Bullets items={program.features} color="#1d4ed8" />
            </div>
          )}
        </Card>
      )}
      <Card title="누가 듣나요?" icon="👧">
        <InfoRow label="대상">
          {program.targetGrade} · 정원 {program.maxStudents}명
        </InfoRow>
        <InfoRow label="수업">
          총 {program.totalSessions}회 · {program.totalHours}차시
          <span className="block text-[15px] text-gray-600">회당 {program.sessionHours}차시 (120분)</span>
        </InfoRow>
        {teachers.length > 0 && (
          <InfoRow label="강사">
            {teachers.join(", ")}
            <span className="block text-[15px] text-gray-600">회차마다 담당 강사가 달라요</span>
          </InfoRow>
        )}
      </Card>
    </>
  );
}
