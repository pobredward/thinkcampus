/**
 * 명단 import — react-datasheet-grid 행 모델 ↔ importRoster
 */

import { parseRosterText, type ParsedRosterRow } from "./parseRosterTable";

export type RosterColumnKey = keyof Pick<
  ParsedRosterRow,
  | "studentName"
  | "birthDate"
  | "contractCode"
  | "campusId"
  | "parentPhone"
  | "householdKey"
  | "externalStudentId"
>;

export const ROSTER_COLUMNS: { key: RosterColumnKey; label: string; hint?: string; required?: boolean }[] = [
  { key: "studentName", label: "학생명", required: true },
  { key: "birthDate", label: "생년월일", hint: "YYYYMMDD", required: true },
  { key: "contractCode", label: "운영 건 코드", hint: "contractCode", required: true },
  { key: "campusId", label: "캠퍼스 ID", required: true },
  { key: "parentPhone", label: "학부모 번호", hint: "선택" },
  { key: "householdKey", label: "가구 키", hint: "선택" },
  { key: "externalStudentId", label: "외부 학생 ID", hint: "선택" },
];

export const DEFAULT_EMPTY_ROWS = 12;

export interface RosterGridRow {
  id: string;
  studentName: string;
  birthDate: string;
  contractCode: string;
  campusId: string;
  parentPhone: string;
  householdKey: string;
  externalStudentId: string;
}

function cell(v: string | null | undefined): string {
  return (v ?? "").trim();
}

export function createEmptyRosterRow(): RosterGridRow {
  return {
    id: `r-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    studentName: "",
    birthDate: "",
    contractCode: "",
    campusId: "",
    parentPhone: "",
    householdKey: "",
    externalStudentId: "",
  };
}

export function emptyRosterRows(count = DEFAULT_EMPTY_ROWS): RosterGridRow[] {
  return Array.from({ length: count }, () => createEmptyRosterRow());
}

export function rowHasData(r: RosterGridRow): boolean {
  return Boolean(
    cell(r.studentName) ||
      cell(r.birthDate) ||
      cell(r.contractCode) ||
      cell(r.campusId) ||
      cell(r.parentPhone) ||
      cell(r.householdKey) ||
      cell(r.externalStudentId),
  );
}

function rosterRowToParsed(r: RosterGridRow): ParsedRosterRow {
  return {
    studentName: cell(r.studentName),
    birthDate: cell(r.birthDate).replace(/\D/g, ""),
    contractCode: cell(r.contractCode),
    campusId: cell(r.campusId),
    ...(cell(r.parentPhone) ? { parentPhone: cell(r.parentPhone) } : {}),
    ...(cell(r.householdKey) ? { householdKey: cell(r.householdKey) } : {}),
    ...(cell(r.externalStudentId) ? { externalStudentId: cell(r.externalStudentId) } : {}),
  };
}

/** 완전히 채워진 행만 (import용) */
export function rosterRowsToParsed(rows: RosterGridRow[]): ParsedRosterRow[] {
  const { rows: valid } = validateRosterRows(rows);
  return valid;
}

/** 부분 입력 행은 무시, 데이터 있는데 필수 누락이면 오류 */
export function validateRosterRows(rows: RosterGridRow[]): {
  rows: ParsedRosterRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const valid: ParsedRosterRow[] = [];

  rows.forEach((r, index) => {
    if (!rowHasData(r)) return;

    const missing: string[] = [];
    if (!cell(r.studentName)) missing.push("학생명");
    if (!cell(r.birthDate)) missing.push("생년월일");
    if (!cell(r.contractCode)) missing.push("운영 건 코드");
    if (!cell(r.campusId)) missing.push("캠퍼스 ID");

    if (missing.length > 0) {
      errors.push(`${index + 1}행: ${missing.join(", ")}을(를) 입력해 주세요.`);
      return;
    }

    const birth = cell(r.birthDate).replace(/\D/g, "");
    if (birth.length !== 8) {
      errors.push(`${index + 1}행: 생년월일은 8자리(YYYYMMDD)여야 합니다.`);
      return;
    }

    valid.push(rosterRowToParsed(r));
  });

  return { rows: valid, errors };
}

/** @deprecated validateRosterRows 사용 */
export function parseRosterRows(rows: RosterGridRow[]): { rows: ParsedRosterRow[]; errors: string[] } {
  return validateRosterRows(rows);
}

export function parsedToRosterRows(parsed: ParsedRosterRow[]): RosterGridRow[] {
  const rows = parsed.map((r) => ({
    id: createEmptyRosterRow().id,
    studentName: r.studentName,
    birthDate: r.birthDate,
    contractCode: r.contractCode,
    campusId: r.campusId,
    parentPhone: r.parentPhone ?? r.guardianPhone ?? "",
    householdKey: r.householdKey ?? "",
    externalStudentId: r.externalStudentId ?? "",
  }));
  while (rows.length < DEFAULT_EMPTY_ROWS) rows.push(createEmptyRosterRow());
  return rows;
}

/** @deprecated string[][] — use RosterGridRow */
export function emptyGrid(rows = DEFAULT_EMPTY_ROWS): string[][] {
  return emptyRosterRows(rows).map((r) =>
    ROSTER_COLUMNS.map((c) => r[c.key as keyof RosterGridRow] as string),
  );
}

export function parseGrid(grid: string[][]): { rows: ParsedRosterRow[]; errors: string[] } {
  const rosterRows: RosterGridRow[] = grid.map((cells) => {
    const base = createEmptyRosterRow();
    ROSTER_COLUMNS.forEach((col, i) => {
      base[col.key] = cells[i] ?? "";
    });
    return base;
  });
  return parseRosterRows(rosterRows);
}
