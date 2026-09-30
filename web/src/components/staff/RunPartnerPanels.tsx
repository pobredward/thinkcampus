"use client";

/**
 * 통합 관리자 · 운영 건 상세의 발주처 관련 칸
 *   PartnerOfficersPanel  발주처 담당자 — 목록 · 초대(임시 비밀번호 한 번만 보여 줌) · 권한 해제 · 학생 이름 가리기
 *   RunSurveyPanel        만족도 조사 — 열기 · 기간 바꾸기 · 응답 요약 · 민원 요약
 */

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Badge, Button, Card, Empty, Field, inputClass, Loading, SectionLabel } from "@/components/staff/ui";
import { surveyRate } from "@/components/survey/SurveyResultsView";
import { chatStamp } from "@/lib/chatTime";
import { dateToKey } from "@/lib/dates";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery, type InviteOfficerResult, type OfficerDto } from "@/services";

export function PartnerOfficersPanel({ programRunId, municipalityName, nameMasking }: { programRunId: string; municipalityName: string; nameMasking: boolean }) {
  const api = useApi();
  const toast = useToast();
  const { data, loading } = useQuery(() => api.company.listOfficers(programRunId), [api, programRunId]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revoking, setRevoking] = useState<OfficerDto | null>(null);
  const revoke = useMutation((uid: string) => api.company.revokeOfficer(uid, programRunId));
  const masking = useMutation((v: boolean) => api.company.updatePartnerSettings(programRunId, { nameMasking: v }));
  // 누르는 즉시 바뀌어 보이게 (저장이 실패하면 되돌린다)
  const [mask, setMask] = useState(nameMasking);
  useEffect(() => setMask(nameMasking), [nameMasking]);

  return (
    <>
      <SectionLabel
        right={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            담당자 초대
          </Button>
        }
      >
        발주처 담당자
      </SectionLabel>
      <p className="mb-2 text-[14px] leading-[20px] text-sub">
        {municipalityName} 담당 공무원이 /partner 에서 출석 · 민원 처리 · 수업 내용 · 만족도를 보고 보고서를 만들어요. 학부모 연락처 · 생년월일은 보이지 않아요.
      </p>
      {loading && !data ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <Empty title="초대한 담당자가 없어요" desc="이메일로 계정을 만들면 임시 비밀번호가 한 번 보여요. 첫 로그인 때 비밀번호를 바꾸게 해요." />
      ) : (
        <ul className="flex flex-col gap-2" data-testid="officer-list">
          {data.map((o) => (
            <li key={o.uid} className="flex items-start gap-3 rounded-[16px] border border-line bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold text-fg">
                  {o.displayName}
                  {o.title ? <span className="font-semibold text-sub"> {o.title}</span> : null}
                </p>
                <p className="mt-[2px] text-[14px] text-sub">
                  {o.organization} · {o.email}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {o.mustChangePassword ? <Badge tone="late">첫 로그인 전</Badge> : <Badge tone="dim">{o.lastLoginAt ? `최근 접속 ${chatStamp(o.lastLoginAt)}` : "접속 기록 없음"}</Badge>}
                  {o.programRunIds.length > 1 && <Badge tone="neutral">운영 건 {o.programRunIds.length}개</Badge>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setRevoking(o)}>
                권한 해제
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Card className="mt-2">
        <label className="flex min-h-[44px] items-center justify-between gap-3">
          <span>
            <span className="block text-[15px] font-bold text-fg">학생 이름 가리기</span>
            <span className="mt-[2px] block text-[14px] text-sub">발주처 화면 · 보고서에 “김○준”처럼 보여요 (학부모 후기는 항상 가려요)</span>
          </span>
          <input
            type="checkbox"
            checked={mask}
            disabled={masking.pending}
            onChange={async (e) => {
              const v = e.target.checked;
              setMask(v);
              try {
                await masking.run(v);
                toast.show(v ? "이름을 가려서 보여 줘요" : "이름을 그대로 보여 줘요");
              } catch (err) {
                setMask(!v);
                toast.show((err as Error).message);
              }
            }}
            className="h-6 w-6 shrink-0 accent-[#d4b06a]"
            data-testid="partner-masking"
          />
        </label>
      </Card>

      <BottomSheet open={inviteOpen} onClose={() => setInviteOpen(false)} title="발주처 담당자 초대">
        {inviteOpen && <InviteForm programRunId={programRunId} municipalityName={municipalityName} />}
      </BottomSheet>

      <BottomSheet open={!!revoking} onClose={() => setRevoking(null)} title="권한 해제">
        {revoking && (
          <div className="flex flex-col gap-4">
            <p className="text-[16px] leading-[24px] text-fg2">
              {revoking.displayName}님이 이 운영 건을 더 볼 수 없게 돼요.
              {revoking.programRunIds.length <= 1 ? " 다른 운영 건이 없어서 로그인도 막혀요." : ""}
            </p>
            <Button
              variant="danger"
              size="lg"
              loading={revoke.pending}
              onClick={async () => {
                try {
                  await revoke.run(revoking.uid);
                  toast.show("권한을 해제했어요");
                  setRevoking(null);
                } catch (e) {
                  toast.show((e as Error).message);
                }
              }}
            >
              해제하기
            </Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}

function InviteForm({ programRunId, municipalityName }: { programRunId: string; municipalityName: string }) {
  const api = useApi();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState(`${municipalityName} `);
  const [title, setTitle] = useState("");
  const [result, setResult] = useState<InviteOfficerResult | null>(null);
  const invite = useMutation(() => api.company.inviteOfficer({ programRunId, email, displayName: name, organization: org, title: title || undefined }));

  if (result) {
    const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/partner/login` : "/partner/login";
    const message = result.tempPassword
      ? `[씽크캠퍼스] 발주처 담당자 계정이 만들어졌어요.\n주소: ${loginUrl}\n아이디: ${result.email}\n임시 비밀번호: ${result.tempPassword}\n처음 로그인하면 비밀번호를 바꿔 주세요.`
      : `[씽크캠퍼스] 담당 운영 건이 추가됐어요.\n주소: ${loginUrl}\n아이디: ${result.email} (쓰시던 비밀번호로 로그인)`;
    return (
      <div className="flex flex-col gap-4" data-testid="invite-result">
        {result.tempPassword ? (
          <div className="rounded-[14px] border border-gold-dim bg-gold-light px-4 py-4">
            <p className="text-[14px] font-bold text-gold">임시 비밀번호 — 지금 한 번만 보여요</p>
            <p className="mt-2 select-all font-mono text-[22px] font-extrabold tracking-wide text-fg" data-testid="temp-password">
              {result.tempPassword}
            </p>
            <p className="mt-2 text-[14px] text-sub">아이디 {result.email}</p>
          </div>
        ) : (
          <p className="text-[16px] text-fg2">이미 담당자 계정이 있어서 이 운영 건만 더했어요. 쓰던 비밀번호로 로그인하면 돼요.</p>
        )}
        <Button
          size="lg"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(message);
              toast.show("안내 문구를 복사했어요");
            } catch {
              toast.show("복사하지 못했어요. 직접 적어 주세요.");
            }
          }}
        >
          안내 문구 복사
        </Button>
        <pre className="whitespace-pre-wrap rounded-[12px] border border-line bg-elev px-3 py-2 text-[14px] leading-[21px] text-fg2">{message}</pre>
      </div>
    );
  }

  return (
    <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto pb-1">
      <Field label="이름" htmlFor="off-name" required>
        <input id="off-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputClass} />
      </Field>
      <Field label="이메일 (로그인 아이디)" htmlFor="off-email" required>
        <input id="off-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="name@korea.kr" />
      </Field>
      <Field label="소속 (기관 · 부서)" htmlFor="off-org" required>
        <input id="off-org" value={org} onChange={(e) => setOrg(e.target.value)} maxLength={60} className={inputClass} />
      </Field>
      <Field label="직함 (선택)" htmlFor="off-title">
        <input id="off-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={20} className={inputClass} placeholder="주무관" />
      </Field>
      {invite.error && (
        <p className="text-[15px] text-danger" role="alert">
          {invite.error}
        </p>
      )}
      <Button
        size="lg"
        loading={invite.pending}
        onClick={async () => {
          try {
            setResult(await invite.run());
          } catch {
            /* invite.error */
          }
        }}
      >
        계정 만들기
      </Button>
    </div>
  );
}

/** 만족도 조사 — 열기 · 기간 바꾸기 · 응답 요약 */
export function RunSurveyPanel({ programRunId, startDate, endDate }: { programRunId: string; startDate: string; endDate: string | null }) {
  const api = useApi();
  const toast = useToast();
  const { data, loading } = useQuery(() => api.company.getSurveyResults(programRunId), [api, programRunId]);
  const [editing, setEditing] = useState(false);
  const today = dateToKey(new Date());
  const [opens, setOpens] = useState(today > startDate ? today : startDate);
  const [closes, setCloses] = useState(endDate ?? today);
  const save = useMutation(() => api.company.upsertSurvey({ programRunId, opensAt: `${opens}T00:00:00+09:00`, closesAt: `${closes}T23:59:59+09:00` }));

  const statusLabel = data ? (data.status === "open" ? "진행 중" : data.status === "closed" ? "마감" : "시작 전") : "";
  const rate = data ? surveyRate(data) : null;

  return (
    <>
      <SectionLabel
        right={
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            {data ? "기간 바꾸기" : "조사 열기"}
          </Button>
        }
      >
        만족도 조사
      </SectionLabel>
      {loading && !data ? (
        <Loading />
      ) : !data ? (
        <Empty title="아직 조사를 열지 않았어요" desc="기본 5문항(전반 · 수업 내용 · 강사 · 운영 · 재참여)으로 열리고, 학부모 앱 홈에 참여 카드가 떠요." />
      ) : (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={data.status === "open" ? "gold" : "dim"}>{statusLabel}</Badge>
            <span className="text-[14px] text-sub">
              {dateToKey(new Date(data.opensAt))} ~ {dateToKey(new Date(data.closesAt))}
            </span>
          </div>
          <p className="mt-2 text-[16px] font-bold text-fg">{data.title}</p>
          <p className="mt-1 text-[15px] text-fg2">
            응답 {data.responses}/{data.eligible}명{rate != null ? ` (${rate}%)` : ""} · 평균 {data.overallAvg != null ? data.overallAvg.toFixed(2) : "-"} / 5 · 후기 {data.reviews.length}건
          </p>
        </Card>
      )}
      <BottomSheet open={editing} onClose={() => setEditing(false)} title={data ? "조사 기간 바꾸기" : "만족도 조사 열기"}>
        {editing && (
          <div className="flex flex-col gap-4">
            <Field label="시작일" htmlFor="sv-open">
              <input id="sv-open" type="date" value={opens} onChange={(e) => setOpens(e.target.value)} className={inputClass} />
            </Field>
            <Field label="마감일" htmlFor="sv-close" hint="마감일 밤 12시에 닫혀요">
              <input id="sv-close" type="date" value={closes} onChange={(e) => setCloses(e.target.value)} className={inputClass} />
            </Field>
            {save.error && <p className="text-[15px] text-danger">{save.error}</p>}
            <Button
              size="lg"
              loading={save.pending}
              onClick={async () => {
                try {
                  await save.run();
                  toast.show(data ? "기간을 바꿨어요" : "조사를 열었어요");
                  setEditing(false);
                } catch {
                  /* save.error */
                }
              }}
            >
              저장
            </Button>
          </div>
        )}
      </BottomSheet>
    </>
  );
}
