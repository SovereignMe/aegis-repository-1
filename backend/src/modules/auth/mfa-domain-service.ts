import crypto from "node:crypto";
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function normalizeBase32(input: string): string { return String(input || "").toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, ""); }
function decodeBase32(input: string): Buffer {
  const clean = normalizeBase32(input); let bits = "";
  for (const char of clean) { const index = alphabet.indexOf(char); if (index < 0) continue; bits += index.toString(2).padStart(5, "0"); }
  const bytes: number[] = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
export class MfaDomainService {
  generateBase32Secret(length = 32): string { const bytes = crypto.randomBytes(length); return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join(""); }
  generateOtp(secret: string, timestamp = Date.now()): string {
    const counter = Math.floor(timestamp / 30000); const key = decodeBase32(secret); const message = Buffer.alloc(8); message.writeBigUInt64BE(BigInt(counter));
    const digest = crypto.createHmac("sha1", key).update(message).digest(); const offset = digest[digest.length - 1] & 0x0f;
    const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
    return String(binary % 1000000).padStart(6, "0");
  }
  verifyOtp(secret: string, code: string): boolean {
    const trimmed = String(code || "").trim(); if (!/^\d{6}$/.test(trimmed)) return false; const now = Date.now();
    for (const offset of [-30000, 0, 30000]) if (this.generateOtp(secret, now + offset) === trimmed) return true; return false;
  }
  generateRecoveryCodes(): string[] { return Array.from({ length: 8 }, () => crypto.randomBytes(5).toString("hex").toUpperCase()); }
}
export const mfaDomainService = new MfaDomainService();
