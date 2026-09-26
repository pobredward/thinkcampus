"use client";

import { useState } from "react";
import Link from "next/link";
import { httpsCallable } from "firebase/functions";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getFns } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";

interface SessionRow {
  sessionTemplateId: string;
  topic: string;
  lessonCount: number;
}

export default function AdminNewProgramRunPage() {
  usePageTitle("운영 건 생성");
  const { user } = useAuth();
  const [contractCode, setContractCode] = useState("");
  const [campusId, setCampusId] = useState("campus-ds26");
  const [municipalityName, setMunicipalityName] = useState("");
  const [programTemplateId, setProgramTemplateId] = useState("tpl-custom");
  const [startDate, setStartDate] = useState("2026-09-05");
  const [endDate, setEndDate] = useState("2026-11-14");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly">("biweekly");
  const [fixedDay, setFixedDay] = useState(6);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [location, setLocation] = useState("");
  const [defaultLessonCount, setDefaultLessonCount] = useState(3);
  const [excludedDates, setExcludedDates] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([
    { sessionTemplateId: "sess-1", topic: "1회차", lessonCount: 3 },
    { sessionTemplateId: "sess-2", topic: "2회차", lessonCount: 3 },
  ]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addSession = () => {
    const n = sessions.length + 1;
    setSessions([...sessions, { sessionTemplateId: `sess-${n}`, topic: `${n}회차`, lessonCount: defaultLessonCount }]);
  };

  const submit = async () => {
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fn = httpsCallable(getFns(), "createProgramRun");
      const excluded = excludedDates
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
      const res = await fn({
        contractCode: contractCode.trim(),
        campusId: campusId.trim(),
        municipalityName: municipalityName.trim(),
        programTemplateId: programTemplateId.trim(),
        startDate,
        endDate,
        frequency,
        fixedDay,
        startTime,
        endTime,
        location: location.trim(),
        defaultLessonCount,
        excludedDates: excluded.length ? excluded : undefined,
        fillSessionCount: true,
        sessionPlan: sessions.map((s) => ({
          sessionTemplateId: s.sessionTemplateId,
          topic: s.topic,
          lessonCount: s.lessonCount,
        })),
      });
      const data = res.data as { programRunId: string; runSessionCount: number };
      setResult(`생성됨: ${data.programRunId} (${data.runSessionCount}회차)`);
    } catch (e: unknown) {
      setError(e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-fg2">
        <Link href="/admin" className="underline">← Admin</Link>
      </p>
      <h1 className="text-2xl font-bold">운영 건 생성</h1>
      <p className="text-sm text-fg2">contractCode는 import CSV와 동일해야 합니다.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          contractCode
          <input className="mt-1 w-full rounded border border-line px-2 py-1.5" value={contractCode} onChange={(e) => setContractCode(e.target.value)} />
        </label>
        <label className="block text-sm">
          campusId
          <input className="mt-1 w-full rounded border border-line px-2 py-1.5" value={campusId} onChange={(e) => setCampusId(e.target.value)} />
        </label>
        <label className="block text-sm sm:col-span-2">
          지자체 이름
          <input className="mt-1 w-full rounded border border-line px-2 py-1.5" value={municipalityName} onChange={(e) => setMunicipalityName(e.target.value)} />
        </label>
        <label className="block text-sm">
          시작일
          <input type="date" className="mt-1 w-full rounded border border-line px-2 py-1.5" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="block text-sm">
          종료일
          <input type="date" className="mt-1 w-full rounded border border-line px-2 py-1.5" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <label className="block text-sm">
          주기
          <select className="mt-1 w-full rounded border border-line px-2 py-1.5" value={frequency} onChange={(e) => setFrequency(e.target.value as "weekly" | "biweekly")}>
            <option value="weekly">매주</option>
            <option value="biweekly">격주</option>
          </select>
        </label>
        <label className="block text-sm">
          요일 (0=일 … 6=토)
          <input type="number" min={0} max={6} className="mt-1 w-full rounded border border-line px-2 py-1.5" value={fixedDay} onChange={(e) => setFixedDay(Number(e.target.value))} />
        </label>
        <label className="block text-sm">
          시작 시각
          <input className="mt-1 w-full rounded border border-line px-2 py-1.5" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </label>
        <label className="block text-sm">
          종료 시각
          <input className="mt-1 w-full rounded border border-line px-2 py-1.5" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </label>
        <label className="block text-sm sm:col-span-2">
          장소
          <input className="mt-1 w-full rounded border border-line px-2 py-1.5" value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label className="block text-sm sm:col-span-2">
          휴무일 (YYYY-MM-DD, 쉼표 구분)
          <input className="mt-1 w-full rounded border border-line px-2 py-1.5" value={excludedDates} onChange={(e) => setExcludedDates(e.target.value)} placeholder="2026-10-03" />
        </label>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">회차</h2>
        <ul className="space-y-2">
          {sessions.map((s, i) => (
            <li key={i} className="flex flex-wrap gap-2">
              <input className="flex-1 rounded border border-line px-2 py-1 text-sm" value={s.topic} onChange={(e) => {
                const next = [...sessions];
                next[i] = { ...s, topic: e.target.value };
                setSessions(next);
              }} placeholder="주제" />
              <input type="number" min={1} max={6} className="w-16 rounded border border-line px-2 py-1 text-sm" value={s.lessonCount} onChange={(e) => {
                const next = [...sessions];
                next[i] = { ...s, lessonCount: Number(e.target.value) };
                setSessions(next);
              }} title="교시 수" />
            </li>
          ))}
        </ul>
        <button type="button" onClick={addSession} className="mt-2 text-sm underline">+ 회차 추가</button>
      </div>

      <button type="button" disabled={loading} onClick={submit} className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg disabled:opacity-50">
        {loading ? "생성 중…" : "운영 건 생성"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
      {result && <p className="text-sm text-fg2">{result}</p>}
    </div>
  );
}
