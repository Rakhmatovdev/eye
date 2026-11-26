// RFC 6238 TOTP code generator — hand-rolled (no new deps) so e2e specs can
// compute a valid 6-digit code against the base32 secret returned by
// POST /auth/mfa/enroll, matching the backend's github.com/pquerna/otp
// defaults: HMAC-SHA1, 30s step, 6 digits, +/-1 step skew tolerance
// (see backend/internal/auth/service.go — totp.Validate(otp, secret)).
import { createHmac } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Decodes an RFC 4648 base32 string (case-insensitive, padding optional) into
// raw bytes — the otpauth "secret" param is base32, not base64.
function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue; // ignore stray separators, just in case
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// HOTP per RFC 4226: HMAC-SHA1 over the big-endian 8-byte counter, then
// dynamic truncation.
function hotp(key: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  // Counter fits comfortably in the low 32 bits for any realistic test run,
  // but write both halves so this doesn't quietly break decades from now.
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binCode % 1_000_000).toString().padStart(6, '0');
}

// Computes the TOTP code for `secret` (base32) at `stepOffset` 30s steps away
// from `atMs` (default: now). Pass stepOffset -1/+1 to tolerate clock skew
// between this machine and the backend.
export function computeTotp(secret: string, stepOffset = 0, atMs: number = Date.now()): string {
  const key = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / 30) + stepOffset;
  return hotp(key, counter);
}

// Tries the current time-step first, then the adjacent ones (t-1, t+1) if the
// caller-supplied `attempt` rejects the code — mirrors the backend's default
// Skew:1 tolerance so a slow/fast test-runner clock doesn't flake the suite.
// `attempt` should return true on success.
export async function withTotpRetry(
  secret: string,
  attempt: (code: string) => Promise<boolean>
): Promise<boolean> {
  for (const offset of [0, -1, 1]) {
    const code = computeTotp(secret, offset);
    if (await attempt(code)) return true;
  }
  return false;
}
