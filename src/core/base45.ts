// Base45 (RFC 9285): компактное представление байтов для QR в алфавитно-цифровом режиме.
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';

export function encodeBase45(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      let x = bytes[i] * 256 + bytes[i + 1];
      const c = x % 45;
      x = (x - c) / 45;
      const d = x % 45;
      const e = (x - d) / 45;
      out += ALPHABET[c] + ALPHABET[d] + ALPHABET[e];
    } else {
      const x = bytes[i];
      const c = x % 45;
      const d = (x - c) / 45;
      out += ALPHABET[c] + ALPHABET[d];
    }
  }
  return out;
}

export function decodeBase45(s: string): Uint8Array {
  const vals: number[] = [];
  for (const ch of s) {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new Error('base45: invalid character');
    vals.push(v);
  }
  const out: number[] = [];
  for (let i = 0; i < vals.length; i += 3) {
    const rem = vals.length - i;
    if (rem >= 3) {
      const x = vals[i] + vals[i + 1] * 45 + vals[i + 2] * 2025;
      if (x > 0xffff) throw new Error('base45: overflow');
      out.push(x >> 8, x & 0xff);
    } else if (rem === 2) {
      const x = vals[i] + vals[i + 1] * 45;
      if (x > 0xff) throw new Error('base45: overflow');
      out.push(x);
    } else {
      throw new Error('base45: bad length');
    }
  }
  return new Uint8Array(out);
}
