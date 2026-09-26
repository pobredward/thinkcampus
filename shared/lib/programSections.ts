/** 운영 건 내 반(섹션) · 로테이션 — 회사 import/센터 배정 공통 */

export const UNASSIGNED_SECTION_ID = "_unassigned";

export interface ProgramSection {
  id: string;
  label: string;
  sortOrder: number;
}

export function normalizeProgramSections(raw: unknown): ProgramSection[] {
  if (!Array.isArray(raw)) return [];
  const out: ProgramSection[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const label = String(row.label ?? "").trim();
    if (!id || !label) continue;
    out.push({
      id,
      label,
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : out.length,
    });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function sectionLabelById(sections: ProgramSection[], sectionId?: string | null): string {
  if (!sectionId || sectionId === UNASSIGNED_SECTION_ID) return "미배정";
  return sections.find((s) => s.id === sectionId)?.label ?? sectionId;
}
