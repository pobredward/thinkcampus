"use client";

/**
 * 회사 · 새 운영 건 — 템플릿을 고르면 회차가 채워지고, 캠퍼스·일정·반·정책을 정한다
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, ErrorBox, Field, inputClass, Loading, PageTitle, SectionLabel, Select } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { todayKey, WEEKDAYS } from "@/lib/dates";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery, type CreateProgramRunInput } from "@/services";

interface SessionRow {
  sessionTemplateId: string;
  topic: string;
  lessonCount: number;
}

export default function CompanyNewRunPage() {
  usePageTitle("새 운영 건");
  const api = useApi();
  const router = useRouter();
  const toast = useToast();
  const { data: templates, loading: tplLoading } = useQuery(() => api.company.listTemplates(), [api]);
  const { data: campuses } = useQuery(() => api.company.listCampuses(), [api]);

  const [contractCode, setContractCode] = useState("");
  const [title, setTitle] = useState("");
  const [campusId, setCampusId] = useState("");
  const [municipalityName, setMunicipalityName] = useState("");
  const [programTemplateId, setProgramTemplateId] = useState("");
  const [startDate, setStartDate] = useState(todayKey());
  const [frequency, setFrequency] = useState<"weekly" | "biweekly">("weekly");
  const [fixedDay, setFixedDay] = useState(6);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [location, setLocation] = useState("");
  const [host, setHost] = useState("");
  const [sectionCount, setSectionCount] = useState(1);
  const [requireCompanyApproval, setRequireCompanyApproval] = useState(false);
  const [excludedDates, setExcludedDates] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const create = useMutation((input: CreateProgramRunInput) => api.company.createRun(input));

  const template = useMemo(() => templates?.find((t) => t.id === programTemplateId), [templates, programTemplateId]);

  useEffect(() => {
    if (!template) return;
    setSessions(template.sessions.map((s) => ({ sessionTemplateId: s.id, topic: s.topic, lessonCount: s.lessonCount })));
    setFrequency(template.defaultFrequency);
    setFixedDay(template.defaultFixedDay);
    setStartTime(template.defaultStartTime);
    setEndTime(template.defaultEndTime);
  }, [template]);

  useEffect(() => {
    const c = campuses?.find((x) => x.id === campusId);
    if (c && !municipalityName) setMunicipalityName(c.municipalityName);
  }, [campusId, campuses, municipalityName]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!contractCode.trim() || !programTemplateId || !campusId || !location.trim()) {
      setError("계약 코드 · 프로그램 · 캠퍼스 · 장소는 꼭 입력해 주세요.");
      return;
    }
    const excluded = excludedDates
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    try {
      const res = await create.run({
        contractCode: contractCode.trim(),
        programTemplateId,
        campusId,
        municipalityName: municipalityName.trim(),
        title: title.trim() || undefined,
        startDate,
        frequency,
        fixedDay,
        startTime,
        endTime,
        location: location.trim(),
        host: host.trim() || undefined,
        sessionPlan: sessions,
        defaultLessonCount: sessions[0]?.lessonCount ?? 3,
        excludedDates: excluded.length ? excluded : undefined,
        sections: Array.from({ length: sectionCount }, (_, i) => ({ id: `sec-${i + 1}`, label: `${i + 1}반` })),
        reportPolicy: { requireCompanyApproval },
      });
      toast.show(`운영 건을 만들었어요 · 회차 ${res.runSessionCount}개`);
      router.replace(`/admin/runs/${encodeURIComponent(res.programRunId)}`);
    } catch (err) {
      setError((err as Error).message || "만들지 못했어요");
    }
  }

  if (tplLoading && !templates) return <Loading />;

  return (
    <div>
      <Link href="/admin/runs" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
        ‹ 운영 건 목록
      </Link>
      <PageTitle title="새 운영 건" desc="계약 코드는 명단 등록 때 쓰는 값과 같아야 해요." />
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <Card>
          <div className="flex flex-col gap-3">
            <Field label="계약 코드" htmlFor="run-code" required hint="예: 2026-달성-창의-02">
              <input id="run-code" className={inputClass} value={contractCode} onChange={(e) => setContractCode(e.target.value)} />
            </Field>
            <Field label="프로그램" htmlFor="run-tpl" required>
              <Select id="run-tpl" value={programTemplateId} onChange={(e) => setProgramTemplateId(e.target.value)}>
                <option value="">프로그램을 고르세요</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {t.defaultSessionCount}회
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="운영 건 이름" htmlFor="run-title" hint="비우면 ‘지자체 + 프로그램’ 으로">
              <input id="run-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={template ? `${municipalityName || "지자체"} ${template.title}` : ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="캠퍼스" htmlFor="run-campus" required>
                <Select id="run-campus" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
                  <option value="">선택</option>
                  {campuses?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="지자체" htmlFor="run-muni" required>
                <input id="run-muni" className={inputClass} value={municipalityName} onChange={(e) => setMunicipalityName(e.target.value)} />
              </Field>
            </div>
            <Field label="장소" htmlFor="run-location" required>
              <input id="run-location" className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: 달성군 청소년수련관 3층 301호" />
            </Field>
            <Field label="주최" htmlFor="run-host">
              <input id="run-host" className={inputClass} value={host} onChange={(e) => setHost(e.target.value)} placeholder="예: 달성군청 교육지원과 · 씽크캠퍼스 운영" />
            </Field>
          </div>
        </Card>

        <SectionLabel>일정</SectionLabel>
        <Card>
          <div className="grid grid-cols-2 gap-3">
            <Field label="첫 수업일" htmlFor="run-start" required>
              <input id="run-start" type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="주기" htmlFor="run-freq">
              <Select id="run-freq" value={frequency} onChange={(e) => setFrequency(e.target.value as "weekly" | "biweekly")}>
                <option value="weekly">매주</option>
                <option value="biweekly">격주</option>
              </Select>
            </Field>
            <Field label="요일" htmlFor="run-day">
              <Select id="run-day" value={fixedDay} onChange={(e) => setFixedDay(Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}요일
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="반 개수" htmlFor="run-sections">
              <Select id="run-sections" value={sectionCount} onChange={(e) => setSectionCount(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n}개 반
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="시작" htmlFor="run-st">
              <input id="run-st" type="time" className={inputClass} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </Field>
            <Field label="종료" htmlFor="run-et">
              <input id="run-et" type="time" className={inputClass} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="쉬는 날" htmlFor="run-excluded" hint="YYYY-MM-DD 를 쉼표로 · 그날은 건너뛰고 다음 주기로">
              <input id="run-excluded" className={inputClass} value={excludedDates} onChange={(e) => setExcludedDates(e.target.value)} placeholder="2027-01-02" />
            </Field>
          </div>
        </Card>

        <SectionLabel right={`${sessions.length}회`}>회차</SectionLabel>
        <Card>
          {sessions.length === 0 ? (
            <p className="text-[15px] text-sub">프로그램을 고르면 회차가 채워져요.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sessions.map((s, i) => (
                <li key={s.sessionTemplateId} className="flex items-center gap-2">
                  <span className="w-[3em] shrink-0 text-[14px] font-bold text-sub">{i + 1}회</span>
                  <input aria-label={`${i + 1}회차 주제`} className={`${inputClass} py-2`} value={s.topic} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, topic: e.target.value } : x)))} />
                  <input
                    aria-label={`${i + 1}회차 차시 수`}
                    type="number"
                    min={1}
                    max={8}
                    className={`${inputClass} w-[4.5em] py-2 text-center`}
                    value={s.lessonCount}
                    onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, lessonCount: Number(e.target.value) || 1 } : x)))}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <SectionLabel>리포트 정책</SectionLabel>
        <Card>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
            <input type="checkbox" checked={requireCompanyApproval} onChange={(e) => setRequireCompanyApproval(e.target.checked)} className="h-5 w-5 accent-[#d4b06a]" />
            <span className="text-[16px] text-fg">센터 검수 뒤 회사 승인을 거쳐 학부모에게 공개</span>
          </label>
        </Card>

        {error && <ErrorBox message={error} />}
        <Button type="submit" size="lg" loading={create.pending}>
          운영 건 만들기
        </Button>
      </form>
    </div>
  );
}
