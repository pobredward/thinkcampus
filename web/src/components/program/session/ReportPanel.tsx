/**
 * 회차 화면 — 수업 리포트 탭 (끝난 회차에만 보임)
 * 선생님 한마디 → 참여도·과제 → 잘한 점 / 다음엔 이렇게 → 이 수업 평가
 */

import { ProgressBar } from "@/components/ui/ProgressBar";
import { getParticipationColor, getParticipationLabel } from "@/data/dummyAttendance";
import { getGradeBg, getGradeColor, type ProgramReport } from "@/data/dummyReport";
import type { DayItem } from "@/data/programView";
import { Bullets, Card, InfoRow, Note, PanelTitle } from "./parts";

export function ReportPanel({
  item,
  evaluation,
  onOpenFullReport,
}: {
  item: DayItem;
  /** 이 회차 과목의 평가 (없으면 숨김) */
  evaluation: ProgramReport | null;
  /** 종합 리포트가 발급됐을 때만 전달 */
  onOpenFullReport?: () => void;
}) {
  const { session, record, status } = item;

  if (!record) {
    return (
      <>
        <PanelTitle>{session.sessionNumber}회차 리포트</PanelTitle>
        <Note>리포트가 아직 올라오지 않았어요. 수업이 끝난 날 저녁에 올라와요.</Note>
      </>
    );
  }

  const absent = status === "absent";

  return (
    <>
      <PanelTitle>{session.sessionNumber}회차 리포트</PanelTitle>

      {absent && <Note>결석한 회차라 참여도와 평가가 없어요.</Note>}

      {record.feedback && (
        <Card title={absent ? "선생님 안내" : "선생님 한마디"} icon="💬">
          <blockquote className="rounded-2xl border-l-4 border-gold bg-elev px-4 py-4">
            <p className="mb-1 text-[15px] font-bold text-gold">{record.instructorName} 강사</p>
            <p className="text-[17px] leading-[27px] text-fg">{record.feedback}</p>
          </blockquote>
        </Card>
      )}

      {!absent && (record.participationScore != null || record.homeworkDone != null) && (
        <Card title="수업 참여" icon="🙌">
          {record.participationScore != null && (
            <InfoRow label="참여도">
              <span className="font-bold" style={{ color: getParticipationColor(record.participationScore) }}>
                {getParticipationLabel(record.participationScore)}
              </span>
              <span className="text-sub"> · {record.participationScore}점</span>
              <ProgressBar
                value={record.participationScore / 100}
                height={10}
                color={getParticipationColor(record.participationScore)}
                className="mt-2"
              />
            </InfoRow>
          )}
          {record.homeworkDone != null && (
            <InfoRow label="과제">
              {record.homeworkDone ? (
                <span className="font-bold text-gold">✓ 제출 완료</span>
              ) : (
                <span className="font-bold text-danger">미제출</span>
              )}
            </InfoRow>
          )}
        </Card>
      )}

      {record.highlights.length > 0 && (
        <Card title="잘한 점" icon="👍">
          <Bullets items={record.highlights} color="#d4b06a" />
        </Card>
      )}

      {record.improvements.length > 0 && (
        <Card title={absent ? "참고해 주세요" : "다음엔 이렇게"} icon="💡">
          <Bullets items={record.improvements} color="#9ca3af" />
        </Card>
      )}

      {!absent && evaluation && (
        <Card title="이 수업 평가" icon="🏅">
          <div className="flex items-center gap-4">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[26px] font-extrabold"
              style={{ color: getGradeColor(evaluation.grade), backgroundColor: getGradeBg(evaluation.grade) }}
            >
              {evaluation.grade}
            </span>
            <div>
              <p className="text-[15px] text-sub">종합 점수</p>
              <p className="text-[24px] font-extrabold leading-[30px] text-fg">
                {evaluation.overallScore}
                <span className="text-[16px] font-semibold text-sub">점</span>
              </p>
            </div>
          </div>
          <ul className="mt-5 flex flex-col gap-4">
            {evaluation.competencies.map((c) => (
              <li key={c.label}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-[16px] font-semibold text-fg2">{c.label}</span>
                  <span className="shrink-0 text-[16px] font-bold text-fg">
                    {c.score}
                    <span className="text-[14px] font-medium text-sub"> / 또래 {c.benchmark}</span>
                  </span>
                </div>
                <ProgressBar value={c.score / 100} height={8} />
              </li>
            ))}
          </ul>
          {onOpenFullReport && (
            <button
              type="button"
              onClick={onOpenFullReport}
              className="tap mt-5 w-full rounded-2xl border border-line py-4 text-center text-[16px] font-bold text-gold"
            >
              종합 리포트 보기
            </button>
          )}
        </Card>
      )}
    </>
  );
}
