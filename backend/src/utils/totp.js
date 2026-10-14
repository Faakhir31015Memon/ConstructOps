import crypto from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

const base32Decode = (input) => {
  let bits = '';
  for (const char of input.toUpperCase().replace(/\s+/g, '').replace(/=+$/, '')) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) throw new Error('Invalid base32 secret');
    bits += value.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
};

const hotp = (key, counter) => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter % 2 ** 32, 4);
  const hash = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const code = ((hash[offset] & 0x7f) << 24 | hash[offset + 1] << 16 | hash[offset + 2] << 8 | hash[offset + 3])
    % 10 ** DIGITS;
  return String(code).padStart(DIGITS, '0');
};

// RFC 6238 TOTP verify with ±`window` step drift (Google Authenticator etc).
export const verifyTotp = (base32Secret, token, window = 1) => {
  const clean = String(token || '').replace(/\D/g, '');
  if (clean.length !== DIGITS) return false;
  try {
    const key = base32Decode(String(base32Secret).trim());
    const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
    for (let drift = -window; drift <= window; drift += 1) {
      if (crypto.timingSafeEqual(Buffer.from(hotp(key, counter + drift)), Buffer.from(clean))) return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const newTotpSecret = () => {
  const bytes = crypto.randomBytes(20);
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i + 5 <= bits.length; i += 5) out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  return out;
};
