/**
 * roster import 시 행마다 householdId 부여 (shared/lib 와 동기화)
 */

import type { RosterImportRow } from '../domain/rosterTypes';

export interface HouseholdResolveInput {
  rowIndex: number;
  householdKey?: string;
  guardianPhone?: string;
}

export function normalizeGuardianPhone(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('010')) return digits;
  if (digits.length === 12 && digits.startsWith('8210')) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('10')) return `0${digits}`;
  return digits.length >= 9 ? digits : null;
}

function stableHouseholdSuffix(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function idFromKey(householdKey: string): string {
  return `hh_key_${stableHouseholdSuffix(householdKey.trim())}`;
}

function idFromPhone(normalizedPhone: string): string {
  return `hh_phone_${stableHouseholdSuffix(normalizedPhone)}`;
}

export type NewSoloIdFactory = (rowIndex: number) => string;

export function resolveHouseholdIds(
  rows: HouseholdResolveInput[],
  soloIdFactory: NewSoloIdFactory,
): Map<number, string> {
  const keyToId = new Map<string, string>();
  const phoneToId = new Map<string, string>();
  const result = new Map<number, string>();

  for (const row of rows) {
    const key = row.householdKey?.trim();
    if (key) {
      if (!keyToId.has(key)) keyToId.set(key, idFromKey(key));
      result.set(row.rowIndex, keyToId.get(key)!);
    }
  }

  for (const row of rows) {
    if (result.has(row.rowIndex)) continue;
    const phone = normalizeGuardianPhone(row.guardianPhone);
    if (phone) {
      if (!phoneToId.has(phone)) phoneToId.set(phone, idFromPhone(phone));
      result.set(row.rowIndex, phoneToId.get(phone)!);
      continue;
    }
    result.set(row.rowIndex, soloIdFactory(row.rowIndex));
  }

  return result;
}

export function resolveHouseholdIdsForRoster(
  roster: RosterImportRow[],
  soloIdFactory: NewSoloIdFactory,
): Map<number, string> {
  const rows: HouseholdResolveInput[] = roster.map((r, i) => ({
    rowIndex: i,
    householdKey: r.householdKey,
    guardianPhone: r.guardianPhone,
  }));
  return resolveHouseholdIds(rows, soloIdFactory);
}

export function soloHouseholdFromStudentId(studentId: string): string {
  return `hh_solo_${stableHouseholdSuffix(studentId)}`;
}
