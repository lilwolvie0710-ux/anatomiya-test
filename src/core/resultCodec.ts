// Упаковка результата в строку для QR: JSON → deflate → base45 с префиксом.
import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { ResultPayload } from '../types';
import { encodeBase45, decodeBase45 } from './base45';
import { hmacSign, hmacVerify } from './crypto';

export const QR_PREFIX = 'AT1:';

/** Каноническая строка для подписи — все поля, кроме h, в фиксированном порядке. */
export function canonical(p: ResultPayload): string {
  const { v, t, n, g, f, s, e, q, a, p: pct, b, w } = p;
  return JSON.stringify([v, t, n, g, f, s, e, q, a, pct, b, w]);
}

export async function signResult(p: ResultPayload, hmacKeyB64: string): Promise<ResultPayload> {
  return { ...p, h: await hmacSign(hmacKeyB64, canonical(p)) };
}

export async function verifyResult(p: ResultPayload, hmacKeyB64: string): Promise<boolean> {
  if (!p.h) return false;
  return hmacVerify(hmacKeyB64, canonical(p), p.h);
}

export function encodeResult(p: ResultPayload): string {
  const json = JSON.stringify(p);
  return QR_PREFIX + encodeBase45(deflateSync(strToU8(json), { level: 9 }));
}

export function decodeResult(text: string): ResultPayload {
  const s = text.trim();
  if (!s.startsWith(QR_PREFIX)) throw new Error('not-a-result');
  const json = strFromU8(inflateSync(decodeBase45(s.slice(QR_PREFIX.length))));
  const p = JSON.parse(json) as ResultPayload;
  if (p.v !== 1 || typeof p.t !== 'string' || !Array.isArray(p.a)) throw new Error('bad-result');
  return p;
}
