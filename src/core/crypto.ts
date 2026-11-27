// Шифрование файла теста и подпись результата. Только WebCrypto, без библиотек.
import type { EncryptedTestFile, TestPayload } from '../types';

export const PBKDF2_ITER = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- base64 ----------
export function toB64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}
export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
export function toB64Url(bytes: Uint8Array): string {
  return toB64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

// ---------- код старта ----------
/** Алфавит без похожих символов (0/O, 1/I/L, 5/S, 2/Z, 8/B). */
export const CODE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';

/** Код вида K7MP-4QX9 (8 символов, ≈37 бит). */
export function generateStartCode(): string {
  const bytes = randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s.slice(0, 4) + '-' + s.slice(4);
}

/** Нормализация введённого кода: регистр, пробелы и дефисы не важны. */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

async function deriveKey(code: string, salt: Uint8Array<ArrayBuffer>, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(normalizeCode(code)), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptTest(
  payload: TestPayload,
  code: string,
  iter = PBKDF2_ITER,
): Promise<EncryptedTestFile> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveKey(code, salt, iter);
  const plain = enc.encode(JSON.stringify(payload));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  return {
    format: 'anatomy-test',
    v: 1,
    testId: payload.testId,
    title: payload.title,
    kdf: { alg: 'PBKDF2-SHA256', iter, salt: toB64(salt) },
    iv: toB64(iv),
    data: toB64(ct),
  };
}

export class WrongCodeError extends Error {
  constructor() {
    super('wrong-code');
  }
}

export async function decryptTest(file: EncryptedTestFile, code: string): Promise<TestPayload> {
  const key = await deriveKey(code, fromB64(file.kdf.salt), file.kdf.iter);
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(file.iv) }, key, fromB64(file.data));
    return JSON.parse(dec.decode(plain)) as TestPayload;
  } catch {
    throw new WrongCodeError();
  }
}

export function isEncryptedTestFile(x: unknown): x is EncryptedTestFile {
  const f = x as EncryptedTestFile;
  return !!f && f.format === 'anatomy-test' && f.v === 1 && typeof f.data === 'string' && !!f.kdf;
}

// ---------- HMAC ----------
async function hmacKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromB64(keyB64), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

/** HMAC-SHA256, усечённый до 16 байт, base64url. */
export async function hmacSign(keyB64: string, message: string): Promise<string> {
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(keyB64), enc.encode(message)));
  return toB64Url(sig.subarray(0, 16));
}

export async function hmacVerify(keyB64: string, message: string, sig: string): Promise<boolean> {
  const expected = await hmacSign(keyB64, message);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

// ---------- PIN преподавателя ----------
export async function hashPin(pin: string, saltB64?: string): Promise<{ salt: string; hash: string }> {
  const salt = saltB64 ? fromB64(saltB64) : randomBytes(16);
  const base = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 200_000 }, base, 256);
  return { salt: toB64(salt), hash: toB64(new Uint8Array(bits)) };
}

/** Короткий хэш строки (для дедупликации результатов). */
export async function sha256Hex(s: string): Promise<string> {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}
