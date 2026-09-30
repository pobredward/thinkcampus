"use client";

/**
 * 만족도 조사 — 학부모 (모바일 app/main/program/[programId]/survey.tsx)
 *   문항 5개 × 1~5점 (크게 누르는 다섯 칸) · 후기(선택, 500자) · 후기 공개 동의(선택, 기본 꺼짐)
 *   응답 기간 안에는 고칠 수 있다. 기간 전 · 끝난 뒤에는 안내만.
 *   쿼리: sid · studentName · programTitle
 *   api.guardian.getSurvey / submitSurvey (실서비스: Callable getSurvey · submitSurvey)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Spinner } from "@/components/ui/Spinner";
import { usePageTitle } from "@/hooks/usePageTitle";
import { programCrumbs } from "@/lib/crumbs";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery, type SurveyDto } from "@/services";

const SCALE: Array<{ v: number; label: string }> = [
  { v: 1, label: "매우 불만족" },
  { v: 2, label: "불만족" },
  { v: 3, label: "보통" },
  { v: 4, label: "만족" },
  { v: 5, label: "매우 만족" },
];

function monthDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function SurveyScreen() {
  usePageTitle("만족도 조사");
  const { programId } = useParams<{ programId: string }>();
  const sp = useSearchParams();
  const sid = sp.get("sid") ?? "";
  const api = useApi();
  const { data, loading, error } = useQuery(() => (sid ? api.guardian.getSurvey(sid, programId) : null), [api, sid, programId]);
  const programTitle = sp.get("programTitle") ?? data?.programTitle ?? "프로그램";
  const crumbs = [...programCrumbs({ programId, programTitle, sp }), { label: "만족도 조사" }];

  return (
    <div className="flex flex-1 flex-col bg-paper pb-10">
      <header className="px-5 pb-4" style={{ paddingTop: "calc(var(--sat) + 4px)" }}>
        <Breadcrumbs items={crumbs} className="mb-1" />
        {data && <p className="text-[15px] text-sub">{data.studentName} 학생</p>}
        <h1 className="mt-2 text-[24px] font-extrabold leading-[33px] text-fg">{data?.title ?? "만족도 조사"}</h1>
      </header>

      {!sid && <Notice title="학생 정보가 없어요" desc="홈에서 다시 들어와 주세요." />}
      {sid && loading && !data && (
        <div className="flex justify-center pt-16">
          <Spinner size="large" />
        </div>
      )}
      {error && !data && <Notice title="조사를 불러오지 못했어요" desc={error} />}
      {sid && !loading && !error && !data && <Notice title="진행 중인 만족도 조사가 없어요" desc="조사가 열리면 홈에서 알려 드려요." />}
      {data && <SurveyBody survey={data} programId={programId} />}
    </div>
  );
}

function Notice({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mx-5 rounded-[20px] border border-dashed border-line bg-card px-6 py-7 text-center">
      <p className="text-[18px] font-bold text-fg2">{title}</p>
      {desc && <p className="mt-2 text-[16px] leading-[24px] text-sub">{desc}</p>}
    </div>
  );
}

function SurveyBody({ survey, programId }: { survey: SurveyDto; programId: string }) {
  const api = useApi();
  const toast = useToast();
  const [scores, setScores] = useState<Record<string, number>>(survey.myResponse?.scores ?? {});
  const [review, setReview] = useState(survey.myResponse?.review ?? "");
  const [consent, setConsent] = useState(survey.myResponse?.consentPublic ?? false);
  const submit = useMutation(() =>
    api.guardian.submitSurvey({ programRunId: programId, studentId: survey.studentId, scores, review, consentPublic: consent && review.trim().length > 0 }),
  );
  const [done, setDone] = useState(false);
  const [missing, setMissing] = useState<string | null>(null);

  // 다른 기기에서 고친 응답이 들어오면 맞춘다 (처음 한 번)
  const submittedAt = survey.myResponse?.submittedAt;
  useEffect(() => {
    if (!survey.myResponse) return;
    setScores(survey.myResponse.scores);
    setReview(survey.myResponse.review);
    setConsent(survey.myResponse.consentPublic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedAt]);

  if (survey.status === "upcoming") {
    return <Notice title={`${monthDay(survey.opensAt)}부터 참여할 수 있어요`} desc={`${monthDay(survey.closesAt)}까지 응답할 수 있어요.`} />;
  }

  if (done) {
    return (
      <div className="mx-5 rounded-[20px] border border-gold-dim bg-gold-light px-6 py-8 text-center" data-testid="survey-done">
        <p className="text-[20px] font-extrabold text-fg">소중한 의견 감사합니다</p>
        <p className="mt-2 text-[16px] leading-[24px] text-fg2">보내 주신 의견은 수업을 더 좋게 만드는 데 쓰여요. {monthDay(survey.closesAt)}까지는 응답을 고칠 수 있어요.</p>
        <Link href="/main" className="tap mt-5 inline-flex h-12 items-center rounded-[14px] bg-gold px-6 text-[16px] font-bold text-ink">
          홈으로
        </Link>
      </div>
    );
  }

  const closed = survey.status === "closed";
  const answered = survey.items.filter((it) => scores[it.id]).length;

  async function handleSubmit() {
    const first = survey.items.find((it) => !scores[it.id]);
    if (first) {
      setMissing(first.id);
      document.getElementById(`q-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      await submit.run();
      setDone(true);
      toast.show(survey.myResponse ? "응답을 고쳤어요" : "응답을 보냈어요");
      window.scrollTo({ top: 0 });
    } catch {
      /* submit.error 로 보인다 */
    }
  }

  return (
    <div className="flex flex-col px-5">
      {survey.intro && <p className="text-[16px] leading-[25px] text-fg2">{survey.intro}</p>}
      <p className="mt-2 text-[15px] text-sub">
        {closed ? "응답 기간이 끝났어요." : `${monthDay(survey.closesAt)}까지 · 문항 ${survey.items.length}개`}
        {survey.myResponse && !closed ? " · 이미 응답했어요 (고칠 수 있어요)" : ""}
      </p>

      <ol className="mt-5 flex flex-col gap-4">
        {survey.items.map((it, idx) => (
          <li
            key={it.id}
            id={`q-${it.id}`}
            className={`rounded-[18px] border bg-card px-4 py-4 ${missing === it.id && !scores[it.id] ? "border-danger" : "border-line"}`}
          >
            <p className="text-[17px] font-bold leading-[25px] text-fg">
              <span className="text-gold">{idx + 1}. </span>
              {it.question}
            </p>
            <div role="radiogroup" aria-label={it.question} className="mt-3 grid grid-cols-5 gap-[6px]">
              {SCALE.map((s) => {
                const on = scores[it.id] === s.v;
                return (
                  <button
                    key={s.v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${s.v}점 ${s.label}`}
                    disabled={closed}
                    onClick={() => {
                      setScores((prev) => ({ ...prev, [it.id]: s.v }));
                      if (missing === it.id) setMissing(null);
                    }}
                    className={`tap flex min-h-[64px] flex-col items-center justify-center rounded-[12px] border px-1 py-2 ${
                      on ? "border-gold bg-gold text-ink" : "border-line2 bg-elev text-fg2"
                    } disabled:opacity-60`}
                  >
                    <span className="text-[20px] font-extrabold leading-none">{s.v}</span>
                    <span className={`mt-1 text-center text-[14px] leading-[18px] ${on ? "font-bold" : ""}`}>{s.label}</span>
                  </button>
                );
              })}
            </div>
            {missing === it.id && !scores[it.id] && <p className="mt-2 text-[14px] text-danger">점수를 골라 주세요.</p>}
          </li>
        ))}
      </ol>

      {survey.allowReview && (
        <div className="mt-5 rounded-[18px] border border-line bg-card px-4 py-4">
          <label htmlFor="survey-review" className="text-[17px] font-bold text-fg">
            하고 싶은 말씀 <span className="text-[15px] font-medium text-sub">(선택)</span>
          </label>
          <textarea
            id="survey-review"
            value={review}
            onChange={(e) => {
              setReview(e.target.value);
              if (!e.target.value.trim()) setConsent(false);
            }}
            disabled={closed}
            maxLength={500}
            rows={4}
            placeholder="좋았던 점, 아쉬운 점을 자유롭게 적어 주세요"
            className="mt-3 block w-full resize-none rounded-[12px] border-[1.5px] border-line2 bg-elev px-4 py-3 text-[16px] leading-[24px] text-fg placeholder:text-faint focus:border-gold"
          />
          <p className="mt-1 text-right text-[14px] text-faint">{review.length}/500</p>
          <label className={`mt-2 flex min-h-[44px] items-start gap-3 ${review.trim() ? "" : "opacity-50"}`}>
            <input
              type="checkbox"
              checked={consent}
              disabled={closed || !review.trim()}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-[3px] h-5 w-5 shrink-0 accent-[#d4b06a]"
            />
            <span className="text-[15px] leading-[22px] text-fg2">{survey.consentLabel}</span>
          </label>
        </div>
      )}

      {!closed && (
        <>
          {submit.error && (
            <p className="mt-4 text-[15px] text-danger" role="alert">
              {submit.error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submit.pending}
            className="tap mt-6 flex h-14 items-center justify-center rounded-[16px] bg-gold text-[17px] font-bold text-ink disabled:opacity-60"
            data-testid="survey-submit"
          >
            {submit.pending ? <Spinner color="#0c0e13" /> : survey.myResponse ? "응답 고치기" : `보내기 (${answered}/${survey.items.length})`}
          </button>
        </>
      )}
    </div>
  );
}
