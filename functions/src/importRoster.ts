import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

import { assertCompanyAdmin } from './auth/assertCompanyAdmin';
import type {
  ImportRosterRequest,
  ImportRosterResponse,
  ImportRosterRowPreview,
  RosterImportRow,
} from './domain/rosterTypes';
import {
  normalizeGuardianPhone,
  resolveHouseholdIdsForRoster,
  soloHouseholdFromStudentId,
} from './lib/resolveHouseholdIds';
import { sha256, toE164Korea } from './lib/crypto';
import { programTitleFromRun } from './lib/programTitle';

function getDb() {
  return admin.firestore();
}

const MAX_ROWS = 500;
const CODE_EXPIRE_DAYS = 180;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function normalizeBirthDate(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 8) {
    throw new HttpsError('invalid-argument', `생년월일 형식 오류: ${raw}`);
  }
  return digits;
}

function stableStudentId(row: RosterImportRow, birthDate: string): string {
  const ext = row.externalStudentId?.trim();
  if (ext) {
    const safe = ext.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
    return `stu_${row.campusId}_${safe}`;
  }
  const name = row.studentName.trim();
  const key = `${row.campusId}\0${birthDate}\0${name}`;
  const h = crypto.createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 24);
  return `stu_${h}`;
}

function randomCodeSuffix(length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) {
    s += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return s;
}

async function allocateEnrollmentCode(campusId: string): Promise<string> {
  const prefix = campusId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || 'TC';
  for (let attempt = 0; attempt < 30; attempt++) {
    const code = `${prefix}-${randomCodeSuffix(5)}`;
    const snap = await getDb().collection('enrollmentCodes').doc(code).get();
    if (!snap.exists) return code;
  }
  throw new HttpsError('internal', '등록코드 생성에 실패했습니다. 다시 시도해주세요.');
}

async function loadProgramRunsByContract(
  contractCodes: string[],
): Promise<
  Map<string, { id: string; campusId: string; status: string; contractCode: string; municipalityName: string }>
> {
  const unique = [...new Set(contractCodes)];
  const map = new Map<
    string,
    { id: string; campusId: string; status: string; contractCode: string; municipalityName: string }
  >();

  for (const code of unique) {
    const snap = await getDb()
      .collection('programRuns')
      .where('contractCode', '==', code)
      .limit(2)
      .get();
    if (snap.empty) {
      throw new HttpsError(
        'not-found',
        `운영 건을 찾을 수 없습니다 (contractCode: ${code}). programRuns를 먼저 생성하세요.`,
      );
    }
    if (snap.size > 1) {
      throw new HttpsError(
        'failed-precondition',
        `contractCode 중복: ${code}`,
      );
    }
    const doc = snap.docs[0];
    const data = doc.data();
    map.set(code, {
      id: doc.id,
      campusId: data.campusId as string,
      status: (data.status as string) ?? 'draft',
      contractCode: code,
      municipalityName: (data.municipalityName as string) ?? '',
    });
  }
  return map;
}

function enrollmentStatusFromRun(runStatus: string): 'upcoming' | 'active' | 'completed' {
  if (runStatus === 'completed') return 'completed';
  if (runStatus === 'active' || runStatus === 'scheduled') return 'active';
  return 'upcoming';
}

function contactPhone(row: RosterImportRow): string | undefined {
  return row.guardianPhone?.trim() || row.parentPhone?.trim() || undefined;
}

function normalizeRowPhones(row: RosterImportRow): RosterImportRow {
  const phone = contactPhone(row);
  return phone ? { ...row, guardianPhone: phone } : row;
}

function validateRow(row: RosterImportRow, rowIndex: number): { birthDate: string } {
  if (!row.studentName?.trim()) {
    throw new HttpsError('invalid-argument', `행 ${rowIndex}: studentName 필요`);
  }
  if (!row.contractCode?.trim()) {
    throw new HttpsError('invalid-argument', `행 ${rowIndex}: contractCode 필요`);
  }
  if (!row.campusId?.trim()) {
    throw new HttpsError('invalid-argument', `행 ${rowIndex}: campusId 필요`);
  }
  const birthDate = normalizeBirthDate(row.birthDate);
  return { birthDate };
}

async function assertCampusesExist(campusIds: string[]): Promise<void> {
  for (const id of campusIds) {
    const snap = await getDb().collection('campuses').doc(id).get();
    if (!snap.exists) {
      throw new HttpsError('not-found', `캠퍼스 없음: ${id}`);
    }
  }
}

export const importRoster = onCall(
  { region: 'asia-northeast3', maxInstances: 5 },
  async (req: CallableRequest<ImportRosterRequest>): Promise<ImportRosterResponse> => {
    assertCompanyAdmin(req);

    const rawRows = req.data?.rows;
    const dryRun = req.data?.dryRun === true;

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      throw new HttpsError('invalid-argument', 'rows 배열이 필요합니다.');
    }
    const rows = rawRows.map(normalizeRowPhones);

    if (rows.length > MAX_ROWS) {
      throw new HttpsError('invalid-argument', `한 번에 최대 ${MAX_ROWS}명까지 import 가능합니다.`);
    }

    const parsed: Array<{ row: RosterImportRow; rowIndex: number; birthDate: string; studentId: string }> = [];
    for (let i = 0; i < rows.length; i++) {
      const { birthDate } = validateRow(rows[i], i);
      parsed.push({
        row: rows[i],
        rowIndex: i,
        birthDate,
        studentId: stableStudentId(rows[i], birthDate),
      });
    }

    const campusIds = [...new Set(parsed.map((p) => p.row.campusId.trim()))];
    await assertCampusesExist(campusIds);

    const contractCodes = parsed.map((p) => p.row.contractCode.trim());
    const runByContract = await loadProgramRunsByContract(contractCodes);

    for (const p of parsed) {
      const run = runByContract.get(p.row.contractCode.trim())!;
      if (run.campusId !== p.row.campusId.trim()) {
        throw new HttpsError(
          'failed-precondition',
          `행 ${p.rowIndex}: campusId(${p.row.campusId})가 운영 건 캠퍼스(${run.campusId})와 다릅니다.`,
        );
      }
    }

    const householdMap = resolveHouseholdIdsForRoster(rows, (rowIndex) => {
      const studentId = parsed[rowIndex]?.studentId;
      if (!studentId) return `hh_solo_row_${rowIndex}`;
      return soloHouseholdFromStudentId(studentId);
    });

    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + CODE_EXPIRE_DAYS * 24 * 60 * 60 * 1000),
    );

    const previews: ImportRosterRowPreview[] = [];
    let createdStudents = 0;
    let updatedStudents = 0;
    let createdProgramEnrollments = 0;
    let createdEnrollmentCodes = 0;

    let batch = getDb().batch();
    let batchOps = 0;

    const flush = async () => {
      if (batchOps === 0) return;
      if (!dryRun) await batch.commit();
      batch = getDb().batch();
      batchOps = 0;
    };

    for (const p of parsed) {
      const { row, rowIndex, birthDate, studentId } = p;
      const contractCode = row.contractCode.trim();
      const campusId = row.campusId.trim();
      const run = runByContract.get(contractCode)!;
      const householdId = householdMap.get(rowIndex)!;

      const studentRef = getDb().collection('students').doc(studentId);
      const studentSnap = await studentRef.get();
      const isNewStudent = !studentSnap.exists;

      const phone = normalizeGuardianPhone(contactPhone(row));
      // 번호가 있으면 가구 묶음 + 앱 자동연결 허용 목록에만 추가 (지자체 CSV에 보호자 여부 없음)
      const phoneHash = phone ? sha256(toE164Korea(phone)) : null;

      const studentPayload: Record<string, unknown> = {
        name: row.studentName.trim(),
        birthDate,
        householdId,
        ...(row.externalStudentId?.trim()
          ? { externalStudentId: row.externalStudentId.trim() }
          : {}),
      };

      if (isNewStudent) {
        studentPayload.guardianUids = [];
        studentPayload.primaryGuardianUid = null;
        studentPayload.allowedGuardianPhoneHashes = phoneHash ? [phoneHash] : [];
        if (!dryRun) {
          batch.set(studentRef, studentPayload);
          batchOps++;
        }
        createdStudents++;
      } else {
        const existing = studentSnap.data() ?? {};
        const hashes: string[] = existing.allowedGuardianPhoneHashes ?? [];
        if (phoneHash && !hashes.includes(phoneHash)) {
          studentPayload.allowedGuardianPhoneHashes = FieldValue.arrayUnion(phoneHash);
        }
        if (!dryRun) {
          batch.set(studentRef, studentPayload, { merge: true });
          batchOps++;
        }
        updatedStudents++;
      }

      const peQuery = await getDb()
        .collection('studentProgramEnrollments')
        .where('studentId', '==', studentId)
        .where('programRunId', '==', run.id)
        .limit(1)
        .get();

      const studentName = row.studentName.trim();
      const programTitle = programTitleFromRun(run.municipalityName, contractCode);
      const peDenorm = {
        studentName,
        contractCode,
        programTitle,
      };

      const isNewProgramEnrollment = peQuery.empty;
      if (isNewProgramEnrollment) {
        const peRef = getDb().collection('studentProgramEnrollments').doc();
        if (!dryRun) {
          batch.set(peRef, {
            studentId,
            programRunId: run.id,
            campusId,
            status: enrollmentStatusFromRun(run.status),
            externalRef: row.externalStudentId?.trim() ?? null,
            ...peDenorm,
            createdAt: FieldValue.serverTimestamp(),
            importedByUid: req.auth!.uid,
          });
          batchOps++;
        }
        createdProgramEnrollments++;
      } else if (!dryRun) {
        batch.update(peQuery.docs[0].ref, peDenorm);
        batchOps++;
      }

      const existingCodeSnap = await getDb()
        .collection('enrollmentCodes')
        .where('studentId', '==', studentId)
        .where('used', '==', false)
        .limit(1)
        .get();

      let enrollmentCode: string;
      let isNewCode = false;

      if (existingCodeSnap.empty) {
        enrollmentCode = dryRun
          ? `DRY-${studentId.slice(-8).toUpperCase()}`
          : await allocateEnrollmentCode(campusId);
        isNewCode = true;
        if (!dryRun) {
          const codeRef = getDb().collection('enrollmentCodes').doc(enrollmentCode);
          batch.set(codeRef, {
            campusId,
            studentId,
            householdId,
            birthDateHash: sha256(birthDate),
            used: false,
            usedAt: null,
            attemptCount: 0,
            lockedUntil: null,
            expiresAt,
            createdAt: FieldValue.serverTimestamp(),
            source: 'importRoster',
          });
          batchOps++;
        }
        createdEnrollmentCodes++;
      } else {
        enrollmentCode = existingCodeSnap.docs[0].id;
        if (!dryRun) {
          batch.update(existingCodeSnap.docs[0].ref, {
            householdId,
            expiresAt,
          });
          batchOps++;
        }
      }

      previews.push({
        rowIndex,
        studentId,
        studentName: row.studentName.trim(),
        householdId,
        programRunId: run.id,
        contractCode,
        enrollmentCode,
        isNewStudent,
        isNewProgramEnrollment,
        isNewCode,
      });

      if (batchOps >= 400) {
        await flush();
      }
    }

    await flush();

    return {
      dryRun,
      rowCount: rows.length,
      createdStudents,
      updatedStudents,
      createdProgramEnrollments,
      createdEnrollmentCodes,
      previews,
      errors: [],
    };
  },
);
