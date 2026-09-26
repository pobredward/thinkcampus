export function programTitleFromRun(municipalityName: string, contractCode: string): string {
  const m = municipalityName?.trim() ?? '';
  const c = contractCode?.trim() ?? '';
  if (m && c) return `${m} ${c}`;
  return m || c || '프로그램';
}
