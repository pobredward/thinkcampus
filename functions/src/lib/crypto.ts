import * as crypto from 'crypto';

const HASH_SALT = process.env.HASH_SALT ?? '';

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value + HASH_SALT).digest('hex');
}

/** 한국 전화번호 → E.164 (+821012345678) */
export function toE164Korea(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('82')) return '+' + digits;
  if (digits.startsWith('0')) return '+82' + digits.slice(1);
  return '+82' + digits;
}
