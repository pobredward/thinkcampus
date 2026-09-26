"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { httpsCallable } from "firebase/functions";
import { RosterPasteGrid } from "@/components/admin/RosterPasteGrid";
import { usePageTitle } from "@/hooks/usePageTitle";
import { getFns } from "@/lib/firebase";
import {
  emptyRosterRows,
  rosterRowsToParsed,
  validateRosterRows,
  parsedToRosterRows,
  type RosterGridRow,
} from "@/lib/rosterGrid";
import type { ParsedRosterRow } from "@/lib/parseRosterTable";
import { parseRosterText } from "@/lib/parseRosterTable";
import { DEMO_IMPORT_PREVIEW, DEMO_PORTAL_BLOCKED } from "@/lib/demoPortal";
import { useAuth } from "@/providers/AuthProvider";
import { useDemoPortal } from "@/providers/DemoPortalProvider";

interface ImportRosterResponse {
  dryRun: boolean;
  rowCount: number;
  createdStudents: number;
  updatedStudents: number;
  createdProgramEnrollments: number;
  createdEnrollmentCodes: number;
  previews: Array<{
    rowIndex: number;
    studentName: string;
    householdId: string;
    enrollmentCode: string;
    contractCode: string;
  }>;
  errors: Array<{ rowIndex: number; message: string }>;
}

export default function AdminImportPage() {
  usePageTitle("명단 import");
  const { user } = useAuth();
  const { active: demoActive, role: demoRole } = useDemoPortal();
  const companyDemo = demoActive && demoRole === "company";
  const [sheetRows, setSheetRows] = useState<RosterGridRow[]>(() => emptyRosterRows());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedRosterRow[]>([]);
  const [result, setResult] = useState<ImportRosterResponse | null>(null);
  const [fnError, setFnError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onRowsChange = useCallback((next: RosterGridRow[]) => {
    setSheetRows(next);
    setParsed(rosterRowsToParsed(next));
    setParseErrors([]);
    setResult(null);
    setFnError(null);
  }, []);

  const runValidation = useCallback((next: RosterGridRow[]) => {
    const { rows, errors } = validateRosterRows(next);
    setParsed(rows);
    setParseErrors(errors);
    setResult(null);
    setFnError(null);
    return { rows, errors };
  }, []);

  const onFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const { rows, errors } = parseRosterText(text);
        if (rows.length > 0) {
          const grid = parsedToRosterRows(rows);
          setSheetRows(grid);
          setParsed(rows);
          setParseErrors(errors);
        } else {
          setParseErrors(errors);
        }
      };
      reader.readAsText(file, "UTF-8");
    },
    [],
  );

  const callImport = useCallback(
    async (dryRun: boolean) => {
      if (!user) {
        setFnError("Firebase 로그인이 필요합니다. (companyAdmin claim 또는 ROSTER_IMPORT_UIDS)");
        return;
      }
      const { rows, errors } = runValidation(sheetRows);
      if (errors.length > 0) {
        setFnError("빨간 안내에 표시된 행을 수정한 뒤 다시 시도해 주세요.");
        return;
      }
      if (rows.length === 0) {
        setFnError("한 명 이상의 완전한 행(학생명·생년월일·운영 건 코드·캠퍼스 ID)을 입력해 주세요.");
        return;
      }
      setLoading(true);
      setFnError(null);
      try {
        if (companyDemo) {
          await new Promise((r) => setTimeout(r, 600));
          if (!dryRun) {
            setFnError(DEMO_PORTAL_BLOCKED.adminSave);
            return;
          }
          setResult({ ...DEMO_IMPORT_PREVIEW, rowCount: rows.length });
          return;
        }
        const fn = httpsCallable<{ rows: ParsedRosterRow[]; dryRun?: boolean }, ImportRosterResponse>(
          getFns(),
          "importRoster",
        );
        const res = await fn({ rows, dryRun });
        setResult(res.data);
      } catch (e: unknown) {
        const msg =
          e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : String(e);
        setFnError(msg);
      } finally {
        setLoading(false);
      }
    },
    [user, sheetRows, runValidation, companyDemo],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-[20px] font-bold">지자체 명단 import</h1>
      <p className="text-sm text-fg2 leading-relaxed">
        표에 엑셀 데이터를 붙여넣으세요. 헤더 행이 포함돼 있어도 열 이름이 맞으면 자동으로 매핑됩니다.
      </p>

      {!user && (
        <p className="rounded-lg border border-line bg-elev px-4 py-3 text-sm text-fg2">
          로그인 후 importRoster를 호출할 수 있습니다.
        </p>
      )}

      <RosterPasteGrid rows={sheetRows} onRowsChange={onRowsChange} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runValidation(sheetRows)}
          className="rounded-lg border border-line px-4 py-2 text-sm"
        >
          유효성 검사
        </button>
        <label className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm">
          CSV 파일
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {parseErrors.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-danger">
          {parseErrors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}

      {parsed.length > 0 && (
        <p className="text-sm text-fg2">import 가능: {parsed.length}명 (필수 항목이 채워진 행)</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading || parsed.length === 0}
          onClick={() => callImport(true)}
          className="rounded-lg bg-elev px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "처리 중…" : "검증 (dryRun)"}
        </button>
        <button
          type="button"
          disabled={loading || parsed.length === 0}
          onClick={() => callImport(false)}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-bg disabled:opacity-50"
        >
          {loading ? "처리 중…" : "실제 import"}
        </button>
      </div>

      {fnError && <p className="text-sm text-danger">{fnError}</p>}

      {result && (
        <div className="space-y-2 rounded-lg border border-line bg-elev p-4 text-sm">
          <p>
            {result.dryRun ? "검증 완료" : "import 완료"} — 학생 신규 {result.createdStudents}, 갱신{" "}
            {result.updatedStudents}, 수강 등록 {result.createdProgramEnrollments}, 코드{" "}
            {result.createdEnrollmentCodes}
          </p>
          <ul className="max-h-64 overflow-auto font-mono text-xs">
            {result.previews.map((p) => (
              <li key={p.rowIndex}>
                {p.studentName} · {p.householdId} · {p.enrollmentCode} · {p.contractCode}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
