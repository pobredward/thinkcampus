"use client";

/**
 * 출결·피드백 탭 (모바일 app/main/attendance.tsx)
 * - 자녀 전환 탭 (2명 이상)
 * - 출결 요약 카드 (출석률·평균참여도·과제완료율)
 * - 회차별 어코디언 리스트 (출결 상태 + 강사 피드백 + 하이라이트)
 */

import { useState } from "react";
import { Collapse } from "@/components/ui/Collapse";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  ALL_ATTENDANCE,
  calcSummary,
  getStatusLabel,
  getStatusColor,
  getStatusBg,
  getParticipationLabel,
  getParticipationColor,
  type SessionRecord,
  type AttendanceSummary,
} from "@/data/dummyAttendance";

// ── 메인 컴포넌트 ──────────────────────────────────────────

export default function AttendanceScreen() {
  usePageTitle("출결·피드백");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const students = ALL_ATTENDANCE;
  const student = students[selectedIdx];
  const summary = calcSummary(student);

  function toggleSession(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f8fafc] pb-8">
      {/* ── 고정 헤더 ── */}
      <div
        className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5"
        style={{ paddingTop: "calc(var(--sat) + 12px)" }}
      >
        <h1 className="pb-3 text-[24px] font-bold text-gray-900">출결 · 피드백</h1>

        {/* 자녀 전환 탭 (2명 이상일 때만) */}
        {students.length > 1 && (
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {students.map((s, i) => {
              const sm = calcSummary(s);
              const isActive = selectedIdx === i;
              return (
                <button
                  key={s.studentId}
                  type="button"
                  aria-pressed={isActive}
                  className={`tap flex shrink-0 items-center gap-[10px] border-b-2 px-3 py-[10px] text-left ${
                    isActive ? "border-brand" : "border-transparent"
                  }`}
                  onClick={() => {
                    setSelectedIdx(i);
                    setExpandedId(null);
                  }}
                >
                  <span
                    className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[15px] ${
                      isActive ? "bg-brand" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`text-[14px] font-bold ${isActive ? "text-white" : "text-gray-700"}`}
                    >
                      {s.studentName.charAt(0)}
                    </span>
                  </span>
                  <span className="block">
                    <span
                      className={`block text-[16px] ${
                        isActive ? "font-bold text-brand" : "font-medium text-gray-500"
                      }`}
                    >
                      {s.studentName}
                    </span>
                    <span className="mt-px block text-[14px] text-gray-500">
                      출석 {sm.attendanceRate}%
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col pt-4">
        {/* ── 요약 카드 ── */}
        <SummaryCard student={student} summary={summary} />

        {/* ── 출결 범례 ── */}
        <div className="mb-2 flex gap-[14px] px-5">
          {(["present", "late", "absent", "upcoming"] as const).map((s) => (
            <div key={s} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-[4px]"
                style={{ backgroundColor: getStatusColor(s) }}
              />
              <span className="text-[14px] text-gray-500">{getStatusLabel(s)}</span>
            </div>
          ))}
        </div>

        {/* ── 회차별 어코디언 ── */}
        <h2 className="mx-5 mb-1 text-[16px] font-bold text-gray-900">회차별 상세</h2>
        <p className="mx-5 mb-[10px] text-[14px] text-gray-500">
          회차를 탭하면 피드백을 펼칩니다.
        </p>

        {student.sessions.map((sess) => (
          <SessionCard
            key={sess.sessionId}
            sess={sess}
            expanded={expandedId === sess.sessionId}
            onToggle={() => toggleSession(sess.sessionId)}
          />
        ))}
      </div>
    </div>
  );
}

// ── 요약 카드 ─────────────────────────────────────────────

function SummaryCard({
  student,
  summary,
}: {
  student: (typeof ALL_ATTENDANCE)[number];
  summary: AttendanceSummary;
}) {
  // 미니 달력 도트 (session status)
  const dots = student.sessions.map((s) => ({
    id: s.sessionId,
    num: s.sessionNumber,
    status: s.status,
  }));

  const rateColor =
    summary.attendanceRate >= 90
      ? "#16a34a"
      : summary.attendanceRate >= 70
        ? "#d97706"
        : "#dc2626";

  return (
    <div className="mx-5 mb-3 rounded-2xl border border-gray-200 bg-white p-[18px]">
      {/* 학생 정보 행 */}
      <div className="mb-[14px] flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[22px] bg-blue-100">
          <span className="text-[20px] font-bold text-brand">{student.studentName.charAt(0)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold text-gray-900">{student.studentName}</p>
          <p className="mt-px text-[14px] text-gray-500">{student.campusName}</p>
          <p className="mt-px text-[14px] text-gray-500">{student.campPeriod}</p>
        </div>
        {/* 출석률 큰 숫자 */}
        <div className="flex shrink-0 flex-col items-center">
          <span className="text-[30px] font-black" style={{ color: rateColor }}>
            {summary.attendanceRate}%
          </span>
          <span className="mt-px text-[14px] text-gray-500">출석률</span>
        </div>
      </div>

      {/* 출결 도트 캘린더 */}
      <div className="mb-4 flex justify-between px-1">
        {dots.map((d) => (
          <div key={d.id} className="flex flex-col items-center gap-[3px]">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-[10px] ${
                d.status === "upcoming"
                  ? "border-[1.5px] border-dashed border-gray-300 bg-gray-100"
                  : ""
              }`}
              style={
                d.status === "upcoming" ? undefined : { backgroundColor: getStatusColor(d.status) }
              }
            >
              {d.status === "upcoming" && (
                <span className="text-[14px] font-bold text-gray-500">{d.num}</span>
              )}
            </div>
            {d.status !== "upcoming" && (
              <span
                className="text-[14px] font-semibold"
                style={{ color: getStatusColor(d.status) }}
              >
                {d.num}
              </span>
            )}
            {d.status === "upcoming" && (
              <span className="text-[14px] font-semibold text-gray-500">{d.num}</span>
            )}
          </div>
        ))}
      </div>

      {/* 3개 지표 */}
      <div className="mb-[14px] flex rounded-xl bg-[#f8fafc] p-3">
        <MetricBox
          label="출결 현황"
          value={`${summary.present + summary.late}/${summary.doneCount}`}
          sub={summary.absent > 0 ? `결석 ${summary.absent}회` : "결석 없음"}
          subColor={summary.absent > 0 ? "#dc2626" : "#16a34a"}
        />
        <div className="my-1 w-px bg-gray-200" />
        <MetricBox
          label="평균 참여도"
          value={`${summary.avgParticipation}점`}
          sub={getParticipationLabel(summary.avgParticipation)}
          subColor={getParticipationColor(summary.avgParticipation)}
        />
        <div className="my-1 w-px bg-gray-200" />
        <MetricBox
          label="과제 완료율"
          value={`${summary.homeworkRate}%`}
          sub={summary.homeworkRate >= 80 ? "우수" : "개선 필요"}
          subColor={summary.homeworkRate >= 80 ? "#16a34a" : "#d97706"}
        />
      </div>

      {/* 진행 현황 바 */}
      <div>
        <div className="mb-[5px] flex justify-between">
          <span className="text-[14px] text-gray-500">캠프 진행</span>
          <span className="text-[14px] font-semibold text-gray-700">
            {summary.doneCount}/{student.totalSessions}회차 완료
          </span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-[4px] bg-gray-100">
          {/* 출석 */}
          <div
            className="h-2"
            style={{
              width: `${(summary.present / student.totalSessions) * 100}%`,
              backgroundColor: "#16a34a",
            }}
          />
          {/* 지각 */}
          <div
            className="h-2"
            style={{
              width: `${(summary.late / student.totalSessions) * 100}%`,
              backgroundColor: "#d97706",
            }}
          />
          {/* 결석 */}
          <div
            className="h-2"
            style={{
              width: `${(summary.absent / student.totalSessions) * 100}%`,
              backgroundColor: "#dc2626",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: string;
  sub: string;
  subColor: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <p className="mb-1 text-center text-[14px] font-semibold text-gray-500">{label}</p>
      <p className="mb-[2px] text-[20px] font-extrabold text-gray-900">{value}</p>
      <p className="text-center text-[14px] font-semibold" style={{ color: subColor }}>
        {sub}
      </p>
    </div>
  );
}

// ── 회차 카드 ─────────────────────────────────────────────

function SessionCard({
  sess,
  expanded,
  onToggle,
}: {
  sess: SessionRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const statusColor = getStatusColor(sess.status);
  const statusBg = getStatusBg(sess.status);
  const isUpcoming = sess.status === "upcoming";

  return (
    <div
      className={`mx-5 mb-2 overflow-hidden rounded-[14px] border ${
        isUpcoming ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white"
      }`}
    >
      {/* 헤더 행 */}
      <button
        type="button"
        onClick={isUpcoming ? undefined : onToggle}
        aria-expanded={isUpcoming ? undefined : expanded}
        className={`flex w-full items-center gap-[10px] p-[13px] text-left ${
          isUpcoming ? "cursor-default" : "tap"
        }`}
      >
        {/* 회차 번호 */}
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: statusBg }}
        >
          <span className="text-[16px] font-extrabold" style={{ color: statusColor }}>
            {sess.sessionNumber}
          </span>
        </span>

        {/* 아이콘 + 정보 */}
        <span className="block min-w-0 flex-1">
          <span className="mb-[3px] flex items-center gap-[5px]">
            <span className="text-[16px]">{sess.programIcon}</span>
            <span
              className={`min-w-0 flex-1 text-[16px] font-semibold ${
                isUpcoming ? "text-gray-500" : "text-gray-900"
              }`}
            >
              {sess.topic}
            </span>
          </span>
          <span className="block text-[14px] text-gray-500">
            {sess.date} · {sess.instructorName}
          </span>
        </span>

        {/* 오른쪽: 상태 뱃지 + 화살표 */}
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-lg px-2 py-[3px]" style={{ backgroundColor: statusBg }}>
            <span className="text-[14px] font-bold" style={{ color: statusColor }}>
              {getStatusLabel(sess.status)}
              {sess.status === "late" && sess.lateMinutes ? ` +${sess.lateMinutes}분` : ""}
            </span>
          </span>
          {!isUpcoming && (
            <span
              className={`inline-block text-[20px] transition-transform duration-200 ${
                expanded ? "rotate-90 text-brand" : "text-gray-500"
              }`}
            >
              ›
            </span>
          )}
        </span>
      </button>

      {/* 확장 영역 */}
      {!isUpcoming && (
        <Collapse open={expanded}>
          <div className="border-t border-gray-100 p-[14px]">
            {/* 참여도 + 과제 */}
            <div className="mb-3 flex items-center gap-[10px]">
              {sess.participationScore !== null && (
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[14px] font-semibold text-gray-500">참여도</p>
                  <ProgressBar
                    value={sess.participationScore / 100}
                    height={6}
                    color={getParticipationColor(sess.participationScore)}
                    track="#f3f4f6"
                    className="mb-[3px]"
                  />
                  <p
                    className="text-[14px] font-semibold"
                    style={{ color: getParticipationColor(sess.participationScore) }}
                  >
                    {sess.participationScore}점 ({getParticipationLabel(sess.participationScore)})
                  </p>
                </div>
              )}
              {sess.homeworkDone !== null && (
                <div className="shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-[9px] py-[5px]">
                  <span
                    className={`text-[14px] font-bold ${
                      sess.homeworkDone ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {sess.homeworkDone ? "✓ 과제 완료" : "✗ 과제 미제출"}
                  </span>
                </div>
              )}
            </div>

            {/* 강사 피드백 */}
            {sess.feedback && (
              <div className="mb-[10px] rounded-[10px] bg-[#f8fafc] p-3">
                <div className="mb-[6px] flex items-center gap-[5px]">
                  <span className="text-[15px]">💬</span>
                  <span className="text-[14px] font-bold text-gray-700">강사 피드백</span>
                </div>
                <p className="text-[15px] leading-[22px] text-gray-700">{sess.feedback}</p>
              </div>
            )}

            {/* 잘한 점 */}
            {sess.highlights.length > 0 && (
              <div className="mb-2 rounded-[10px] border border-green-200 bg-green-50 p-3">
                <p className="mb-[7px] text-[14px] font-bold text-[#166534]">⭐ 잘한 점</p>
                {sess.highlights.map((h, i) => (
                  <div key={i} className="mb-1 flex items-start gap-[7px]">
                    <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-[3px] bg-green-500" />
                    <p className="flex-1 text-[14px] leading-[20px] text-[#166534]">{h}</p>
                  </div>
                ))}
              </div>
            )}

            {/* 개선 사항 */}
            {sess.improvements.length > 0 && (
              <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-3">
                <p className="mb-[7px] text-[14px] font-bold text-[#1e40af]">📈 개선 권장</p>
                {sess.improvements.map((m, i) => (
                  <div key={i} className="mb-1 flex items-start gap-[7px]">
                    <span className="mt-[5px] h-[5px] w-[5px] shrink-0 rounded-[3px] bg-blue-400" />
                    <p className="flex-1 text-[14px] leading-[20px] text-[#1e40af]">{m}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Collapse>
      )}

      {/* 예정 안내 */}
      {isUpcoming && (
        <div className="px-[13px] pb-[10px]">
          <p className="text-[14px] italic text-gray-500">수업 종료 후 피드백이 등록됩니다.</p>
        </div>
      )}
    </div>
  );
}
