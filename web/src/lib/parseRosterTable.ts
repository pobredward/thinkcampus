/**
 * CSV(쉼표) · 엑셀 붙여넣기(탭) 공통 파서
 */

export interface ParsedRosterRow {
  studentName: string;
  birthDate: string;
  contractCode: string;
  campusId: string;
  householdKey?: string;
  guardianPhone?: string;
  parentPhone?: string;
  externalStudentId?: string;
}

export const HEADER_ALIASES: Record<string, keyof ParsedRosterRow> = {
  studentname: "studentName",
  name: "studentName",
  학생명: "studentName",
  birthdate: "birthDate",
  생년월일: "birthDate",
  contractcode: "contractCode",
  contract_code: "contractCode",
  campusid: "campusId",
  campus_id: "campusId",
  householdkey: "householdKey",
  household_key: "householdKey",
  guardianphone: "guardianPhone",
  parentphone: "parentPhone",
  학부모번호: "parentPhone",
  보호자번호: "guardianPhone",
  연락처: "parentPhone",
  externalstudentid: "externalStudentId",
  external_student_id: "externalStudentId",
};

function normalizeHeader(h: string): string {
  return h.trim().replace(/^\ufeff/, "").toLowerCase();
}

function detectDelimiter(headerLine: string): "\t" | "," {
  const tabs = (headerLine.match(/\t/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  if (tabs > commas) return "\t";
  return ",";
}

function splitRow(line: string, delimiter: "\t" | ","): string[] {
  if (delimiter === "\t") {
    return line.split("\t").map((c) => c.trim().replace(/^"|"$/g, ""));
  }
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** 엑셀에서 복사한 값 또는 CSV 텍스트 */
export function parseRosterText(text: string): { rows: ParsedRosterRow[]; errors: string[] } {
  const errors: string[] = [];
  const raw = text.replace(/^\ufeff/, "");
  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { rows: [], errors: ["헤더 행과 데이터 행이 필요합니다. (엑셀에서 전체 선택 후 복사)"] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitRow(lines[0], delimiter).map(normalizeHeader);
  const colMap: (keyof ParsedRosterRow | null)[] = headers.map((h) => HEADER_ALIASES[h] ?? null);

  const required: (keyof ParsedRosterRow)[] = ["studentName", "birthDate", "contractCode", "campusId"];
  for (const req of required) {
    if (!colMap.includes(req)) {
      errors.push(`필수 컬럼 없음: ${req} (첫 줄 헤더 확인)`);
    }
  }
  if (errors.length > 0) return { rows: [], errors };

  const rows: ParsedRosterRow[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cells = splitRow(lines[li], delimiter);
    const row: Partial<ParsedRosterRow> = {};
    colMap.forEach((key, i) => {
      if (!key) return;
      const v = cells[i]?.trim();
      if (v) (row as Record<string, string>)[key] = v;
    });

    const lineNo = li + 1;
    if (!row.studentName || !row.birthDate || !row.contractCode || !row.campusId) {
      errors.push(`${lineNo}행: 필수 값 누락`);
      continue;
    }

    rows.push({
      studentName: row.studentName,
      birthDate: row.birthDate.replace(/\D/g, ""),
      contractCode: row.contractCode,
      campusId: row.campusId,
      householdKey: row.householdKey,
      guardianPhone: row.guardianPhone,
      parentPhone: row.parentPhone,
      externalStudentId: row.externalStudentId,
    });
  }

  return { rows, errors };
}
