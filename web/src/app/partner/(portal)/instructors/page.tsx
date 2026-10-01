"use client";

/**
 * 발주처 · 강사진 — 회차를 맡은 강사 프로필 (소속 · 전문 분야 · 소개 · 담당 회차) + 캠퍼스 연락처
 * 강사 개인 연락처는 보이지 않는다 (캠퍼스 대표 번호만).
 */

import { Photo } from "@/components/staff/Photo";
import { dayLabel, LessonsSwitch } from "@/components/partner/parts";
import { Card, Empty, ErrorBox, KeyValue, Loading, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePartnerRun } from "@/providers/PartnerRunProvider";
import { useApi, useQuery } from "@/services";

export default function PartnerInstructorsPage() {
  usePageTitle("강사진");
  const api = useApi();
  const { selectedRun } = usePartnerRun();
  const runId = selectedRun?.id ?? null;
  const { data, loading, error, refetch } = useQuery(() => (runId ? api.partner.listInstructors(runId) : null), [api, runId]);

  if (!selectedRun) return <Loading />;
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div>
      <PageTitle title="수업" desc={`강사 ${data.instructors.length}명이 이 프로그램을 맡고 있어요`} />
      <LessonsSwitch current="instructors" />
      {data.instructors.length === 0 ? (
        <Empty title="아직 배정된 강사가 없어요" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.instructors.map((i) => (
            <li key={i.staffId} className="rounded-[18px] border border-line bg-card p-4" data-testid="partner-instructor">
              <div className="flex items-start gap-3">
                <Photo id={i.staffId} name={i.name} photoUrl={i.photoUrl} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-[18px] font-bold text-fg">{i.name}</p>
                  {i.title && <p className="text-[14px] text-sub">{i.title}</p>}
                  {i.specialties.length > 0 && <p className="mt-1 text-[14px] font-semibold text-gold">{i.specialties.join(" · ")}</p>}
                </div>
              </div>
              {i.bio && <p className="mt-3 text-[15px] leading-[23px] text-fg2">{i.bio}</p>}
              <p className="mt-3 text-[14px] font-bold text-sub">담당 {i.sessions.length}회</p>
              <ul className="mt-1 flex flex-col gap-1">
                {i.sessions.map((s, k) => (
                  <li key={k} className="text-[14px] text-fg2">
                    {dayLabel(s.date)} · {s.sessionNumber}회차 {s.sectionLabel} · {s.topic}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <SectionLabel>운영 담당 · 연락처</SectionLabel>
      <Card>
        <KeyValue
          items={[
            { k: "캠퍼스", v: data.contact.campusName },
            ...(data.contact.address ? [{ k: "주소", v: data.contact.address }] : []),
            { k: data.contact.managerRole, v: data.contact.managerName },
            ...(data.contact.phone ? [{ k: "대표 번호", v: <a href={`tel:${data.contact.phone.replace(/\D/g, "")}`} className="text-gold underline">{data.contact.phone}</a> }] : []),
            { k: "학부모 응대", v: data.contact.hours },
          ]}
        />
      </Card>
    </div>
  );
}
