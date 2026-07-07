import "server-only";
import crypto from "crypto";
import QRCode from "qrcode";

// ============================================================================
// TOTP (RFC 6238) — SMS'siz ikki faktorli autentifikatsiya.
// Node'ning ichki `crypto` bilan (tashqi TOTP kutubxonasiz). Google
// Authenticator / Authy bilan mos. RFC 6238 test vektorlariga tekshirilgan.
// ============================================================================

const PERIOD = 30; // soniya
const DIGITS = 6;
const ISSUER = "Shod Flow";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return (code % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** Yangi base32 maxfiy kalit (20 bayt). */
export function generateSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/** Berilgan vaqt uchun TOTP kod (asosan test uchun). */
export function generateToken(secret: string, atMs = Date.now()): string {
  return hotp(secret, Math.floor(atMs / 1000 / PERIOD));
}

/** Kodni tekshiradi (±1 vaqt oynasi tolerantligi bilan). */
export function verifyToken(token: string, secret: string, window = 1): boolean {
  const t = token.trim();
  if (!/^\d{6}$/.test(t)) return false;
  const counter = Math.floor(Date.now() / 1000 / PERIOD);
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(secret, counter + w);
    if (candidate.length === t.length && crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(t))) {
      return true;
    }
  }
  return false;
}

/** Authenticator ilovasi uchun otpauth:// URI. */
export function keyUri(email: string, secret: string): string {
  const label = encodeURIComponent(`${ISSUER}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** otpauth URI'dan QR kod (data URL). */
export async function qrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 220 });
}
