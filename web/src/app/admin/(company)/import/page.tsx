"use client";

/**
 * 회사 · 명단 등록 — 엑셀 붙여넣기(그리드) 또는 CSV → 검증(미리보기) → 등록
 *   1. 표에 붙여 넣기 (학생명 · 생년월일 · 운영 건 코드 · 캠퍼스 ID · 반 · 학부모 번호 …)
 *   2. [미리보기] 로 가구 묶음·등록코드를 확인
 *   3. [등록] 하면 학생 · 수강 · 등록코드가 만들어진다
 */

import { useCallback, useMemo, useState } from "react";
import { RosterPasteGrid } from "@/components/admin/RosterPasteGrid";
import { Badge, Button, Card, ErrorBox, PageTitle, SectionLabel } from "@/components/staff/ui";
import { usePageTitle } from "@/hooks/usePageTitle";
import { parseRosterText, type ParsedRosterRow } from "@/lib/parseRosterTable";
import { emptyRosterRows, parsedToRosterRows, validateRosterRows, type RosterGridRow } from "@/lib/rosterGrid";
import { useToast } from "@/providers/ToastProvider";
import { useApi, useMutation, useQuery, type RosterImportResult } from "@/services";

export default function CompanyImportPage() {
  usePageTitle("명단 등록");
  const api = useApi();
  const toast = useToast();
  const { data: runs } = useQuery(() => api.company.listRuns(), [api]);
  const [sheetRows, setSheetRows] = useState<RosterGridRow[]>(() => emptyRosterRows());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [result, setResult] = useState<RosterImportResult | null>(null);
  const [fnError, setFnError] = useState<string | null>(null);
  const importRows = useMutation((rows: ParsedRosterRow[], dryRun: boolean) => api.company.importRoster(rows, dryRun));
  const [mode, setMode] = useState<"preview" | "commit" | null>(null);

  const validated = useMemo(() => validateRosterRows(sheetRows), [sheetRows]);

  const onRowsChange = useCallback((next: RosterGridRow[]) => {
    setSheetRows(next);
    setParseErrors([]);
    setResult(null);
    setFnError(null);
  }, []);

  const onFile = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = parseRosterText(String(reader.result ?? ""));
      if (rows.length > 0) setSheetRows(parsedToRosterRows(rows));
      setParseErrors(errors);
      setResult(null);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  async function run(dryRun: boolean) {
    setParseErrors(validated.errors);
    setFnError(null);
    if (validated.errors.length > 0) {
      setFnError("빨간 안내에 표시된 행을 고친 뒤 다시 시도해 주세요.");
      return;
    }
    if (validated.rows.length === 0) {
      setFnError("학생명 · 생년월일 · 운영 건 코드 · 캠퍼스 ID 가 모두 채워진 행이 한 줄 이상 필요해요.");
      return;
    }
    setMode(dryRun ? "preview" : "commit");
    try {
      const res = await importRows.run(validated.rows, dryRun);
      setResult(res);
      if (!dryRun && res.errors.length === 0) {
        toast.show(`${res.rowCount}명을 등록했어요`);
        setSheetRows(emptyRosterRows());
      }
    } catch (e) {
      setFnError((e as Error).message || "처리하지 못했어요");
    } finally {
      setMode(null);
    }
  }

  return (
    <div>
      <PageTitle title="명단 등록" desc="지자체에서 받은 명단을 붙여 넣으면 학생·수강·등록코드가 만들어져요." />

      {runs && runs.length > 0 && (
        <Card tone="card2" className="mb-3">
          <p className="text-[14px] font-bold text-sub">운영 건 코드 · 캠퍼스 ID</p>
          <ul className="mt-1 flex flex-col gap-1">
            {runs
              .filter((r) => r.status === "active" || r.status === "scheduled")
              .map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-2 text-[15px] text-fg2">
                  <span className="font-mono text-gold">{r.contractCode}</span>
                  <span className="text-sub">·</span>
                  <span className="font-mono">{r.campusId}</span>
                  <span className="text-sub">
                    · {r.title} · 반 {r.sections.map((s) => s.label).join(", ")}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <RosterPasteGrid rows={sheetRows} onRowsChange={onRowsChange} />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="tap inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border border-line bg-elev px-4 text-[15px] font-semibold text-fg2">
          CSV 파일 불러오기
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </label>
        <span className="text-[14px] text-sub">등록 가능 {validated.rows.length}명</span>
      </div>

      {parseErrors.length > 0 && (
        <ul className="mt-3 list-disc rounded-[14px] border border-danger-border bg-danger-bg py-3 pl-8 pr-4 text-[14px] text-danger">
          {parseErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" onClick={() => void run(true)} loading={mode === "preview"} disabled={mode !== null}>
          미리보기
        </Button>
        <Button size="lg" onClick={() => void run(false)} loading={mode === "commit"} disabled={mode !== null || !result?.dryRun || result.errors.length > 0}>
          등록하기
        </Button>
      </div>
      {!result?.dryRun && <p className="mt-2 text-[14px] text-sub">먼저 미리보기로 가구 묶음과 등록코드를 확인한 뒤 등록할 수 있어요.</p>}

      {fnError && (
        <div className="mt-3">
          <ErrorBox message={fnError} />
        </div>
      )}

      {result && (
        <>
          <SectionLabel right={<Badge tone={result.dryRun ? "neutral" : "gold"}>{result.dryRun ? "미리보기" : "등록 완료"}</Badge>}>결과</SectionLabel>
          <Card>
            <p className="text-[15px] leading-[22px] text-fg2">
              학생 신규 <b className="text-fg">{result.createdStudents}</b> · 갱신 <b className="text-fg">{result.updatedStudents}</b> · 수강 등록{" "}
              <b className="text-fg">{result.createdProgramEnrollments}</b> · 등록코드 <b className="text-fg">{result.createdEnrollmentCodes}</b>
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-[14px] text-danger">
                {result.errors.map((e) => (
                  <li key={`${e.rowIndex}-${e.message}`}>
                    {e.rowIndex + 1}행: {e.message}
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-3 max-h-72 overflow-auto rounded-lg border border-line">
              {result.previews.map((p) => (
                <li key={p.rowIndex} className="flex flex-wrap items-center gap-x-3 border-b border-line px-3 py-2 text-[14px] last:border-b-0">
                  <span className="w-[5em] font-bold text-fg">{p.studentName}</span>
                  <span className="text-fg2">{p.sectionLabel ?? "-"}</span>
                  <span className="font-mono text-gold">{p.enrollmentCode}</span>
                  <span className="text-sub">{p.householdId}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
