"use client";

/**
 * 센터 · 출결 시트 — /admin/center/attendance?session=<runSessionId>
 *   날짜 · 회차 · 반 · 강사  [같은 날 다른 반으로 바로 이동]
 *   입력 현황 → 학생 카드(출석/지각/결석, 누르면 저장)
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AttendanceEditor } from "@/components/staff/AttendanceEditor";
import { Badge, Empty, ErrorBox, fmtDate, fmtDateTime, Loading, PageTitle } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useApi, useQuery } from "@/services";

export default function CenterAttendancePage() {
  const api = useApi();
  const sp = useSearchParams();
  const sessionId = sp.get("session");
  const { data: sheet, loading, error, refetch } = useQuery(() => (sessionId ? api.center.getAttendanceSheet(sessionId) : null), [api, sessionId]);
  usePageTitle(sheet ? `${sheet.session.sectionLabel} 출결` : "출결");

  if (!sessionId) return <Empty title="회차를 골라 주세요" desc="수업 탭에서 반을 고르면 출결을 입력할 수 있어요." />;
  if (loading && !sheet) return <Loading label="출결을 불러오는 중..." />;
  if (error) return <ErrorBox message={error} onRetry={() => void refetch()} />;
  if (!sheet) return null;

  const s = sheet.session;
  const lastUpdate = sheet.students.map((x) => x.updatedAt).filter(Boolean).sort().pop();
  const recordedBy = [...new Set(sheet.students.map((x) => x.recordedByName).filter(Boolean))];

  return (
    <div>
      <Link href={`/admin/center/lessons?date=${s.scheduledDate}`} className="tap inline-flex h-11 items-center text-[15px] font-semibold text-sub">
        ‹ {fmtDate(s.scheduledDate)} 수업으로
      </Link>
      <PageTitle
        eyebrow={`${s.sessionNumber}회차 · ${s.startTime}–${s.endTime}`}
        title={`${s.sectionLabel} 출결`}
        desc={`${s.topic} · ${s.instructorName ?? "강사 미배정"} · ${s.location}`}
        right={s.status === "cancelled" ? <Badge tone="dim">휴강</Badge> : undefined}
      />

      {sheet.siblings.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          <span className="flex h-10 shrink-0 items-center text-[14px] text-sub">같은 날</span>
          {sheet.siblings.map((sb) => (
            <Link
              key={sb.id}
              href={`/admin/center/attendance?session=${encodeURIComponent(sb.id)}`}
              className="tap flex h-10 shrink-0 items-center gap-1 rounded-full border border-line bg-card px-3 text-[14px] font-semibold text-fg2"
            >
              {sb.sectionLabel} <span className="text-sub">{sb.startTime}</span>
              <span className={sb.recordedCount >= sb.enrolledCount ? "text-gold" : "text-sub"}>
                {sb.recordedCount}/{sb.enrolledCount}
              </span>
            </Link>
          ))}
        </div>
      )}

      {sheet.students.length === 0 ? (
        <Empty title="이 반에 학생이 없어요" />
      ) : (
        <AttendanceEditor
          runSessionId={s.id}
          readOnly={s.status === "cancelled"}
          students={sheet.students.map((st) => ({
            studentId: st.studentId,
            name: st.name,
            photoUrl: st.photoUrl,
            status: st.status,
            lateMinutes: st.lateMinutes,
          }))}
          onSave={(inputs) => api.center.recordAttendance(inputs)}
        />
      )}

      {lastUpdate && (
        <p className="mt-4 text-[14px] text-faint">
          마지막 저장 {fmtDateTime(lastUpdate)}
          {recordedBy.length > 0 ? ` · ${recordedBy.join(", ")}` : ""}
        </p>
      )}
    </div>
  );
}
