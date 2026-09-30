"use client";

/**
 * 센터 · 민원·문의 상세 — 내용 · 사진 · 처리 이력 · 발주처 의견 · 처리(상태 · 메모 · 처리 내용)
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { InquiryBadges, InquiryHistory, InquiryUpdateForm } from "@/components/staff/InquiryParts";
import { Button, Card, ErrorBox, KeyValue, Loading, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { chatStamp } from "@/lib/chatTime";
import { useToast } from "@/providers/ToastProvider";
import { INQUIRY_CHANNEL_LABEL, useApi, useQuery } from "@/services";

export default function CenterInquiryDetailPage() {
  const params = useParams<{ inquiryId: string }>();
  const inquiryId = decodeURIComponent(params.inquiryId);
  const api = useApi();
  const toast = useToast();
  const { data: q, loading, error, refetch } = useQuery(() => api.center.getInquiry(inquiryId), [api, inquiryId]);
  usePageTitle(q ? q.title : "민원·문의");

  if (loading && !q) return <Loading />;
  if (error && !q) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!q) return null;

  return (
    <div>
      <Link href="/admin/center/inquiries" className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
        ‹ 민원·문의 목록
      </Link>
      <InquiryBadges q={q} />
      <h1 className="mt-2 text-[22px] font-extrabold leading-[30px] text-fg">{q.title}</h1>

      <Card className="mt-3">
        <KeyValue
          items={[
            { k: "학생", v: q.studentLabel },
            { k: "접수", v: `${q.reporterLabel} · ${chatStamp(q.createdAt)}` },
            { k: "경로", v: INQUIRY_CHANNEL_LABEL[q.channel] },
            ...(q.resolvedAt ? [{ k: "처리", v: `${q.resolvedByName ?? "담당자"} · ${chatStamp(q.resolvedAt)}` }] : []),
          ]}
        />
        <p className="mt-4 whitespace-pre-wrap text-[16px] leading-[25px] text-fg">{q.body}</p>
        {q.photoUrls.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {q.photoUrls.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={u} alt={`첨부 사진 ${i + 1}`} className="h-[120px] w-[120px] rounded-[12px] border border-line object-cover" />
            ))}
          </div>
        )}
        {q.chatRoomId && (
          <div className="mt-4">
            <Button variant="secondary" href={`/admin/center/chat/${encodeURIComponent(q.chatRoomId)}`}>
              학부모 채팅방 열기
            </Button>
          </div>
        )}
      </Card>

      {q.resolution && (
        <>
          <SectionLabel>처리 내용</SectionLabel>
          <Card tone="gold">
            <p className="whitespace-pre-wrap text-[16px] leading-[25px] text-fg">{q.resolution}</p>
          </Card>
        </>
      )}

      {q.officerNote && (
        <>
          <SectionLabel>발주처 담당자 의견</SectionLabel>
          <Card>
            <p className="whitespace-pre-wrap text-[16px] leading-[25px] text-fg2">{q.officerNote}</p>
          </Card>
        </>
      )}

      <SectionLabel>처리 이력</SectionLabel>
      <Card>
        <InquiryHistory q={q} />
      </Card>

      <SectionLabel>{q.status === "resolved" ? "다시 처리하기" : "처리하기"}</SectionLabel>
      <Card>
        <InquiryUpdateForm key={`${q.id}-${q.updatedAt}`} q={q} onDone={() => toast.show("저장했어요")} />
      </Card>
    </div>
  );
}
