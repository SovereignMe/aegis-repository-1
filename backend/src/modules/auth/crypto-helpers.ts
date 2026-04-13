import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { db } from "../../store/governance-store.js";

export function nowIso() { return new Date().toISOString(); }
export function futureIso(seconds: number): string { return new Date(Date.now() + seconds * 1000).toISOString(); }
export function hashPassword(password: string, salt: string): string { return crypto.scryptSync(password, salt, 64).toString("hex"); }
export function encode(input: string): string { return Buffer.from(input).toString("base64url"); }
export function decode(input: string): string { return Buffer.from(input, "base64url").toString("utf8"); }
export function sha256(input: string): string { return crypto.createHash("sha256").update(input).digest("hex"); }

export function derivePublicKeyPem(privateKeyPem: string): string {
  return crypto.createPublicKey(crypto.createPrivateKey(privateKeyPem)).export({ type: "spki", format: "pem" }).toString();
}

export function createKeyFingerprint(publicKeyPem: string): string {
  const der = crypto.createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  return crypto.createHash("sha256").update(der).digest("hex");
}

export function normalizeEd25519KeyPair(input: { publicKey?: string | null; privateKey?: string | null }, options: { allowRepair?: boolean; strictLabel?: string } = {}) {
  const privateKey = String(input.privateKey || "").trim() || null;
  const publicKey = String(input.publicKey || "").trim() || null;
  if (!privateKey && !publicKey) throw new Error(`${options.strictLabel || 'Signing key'} is missing both public and private key material.`);
  if (!privateKey) return { publicKey: publicKey!, privateKey: null, repaired: false };
  const derivedPublicKey = derivePublicKeyPem(privateKey).trim();
  if (!publicKey) return { publicKey: derivedPublicKey, privateKey, repaired: true };
  const suppliedFingerprint = createKeyFingerprint(publicKey);
  const derivedFingerprint = createKeyFingerprint(derivedPublicKey);
  if (suppliedFingerprint === derivedFingerprint) return { publicKey, privateKey, repaired: false };
  if (options.allowRepair === false) throw new Error(`${options.strictLabel || 'Signing key'} public/private key material does not match.`);
  return { publicKey: derivedPublicKey, privateKey, repaired: true };
}

export function getSecuritySettings(): Record<string, any> {
  const security = ((db.settings as Record<string, any>)?.security || {}) as Record<string, any>;
  const keyManagement = security.sessionSigning || {};
  const keys = { ...(keyManagement.keys || {}) } as Record<string, any>;
  for (const [, record] of Object.entries(keys)) {
    if (record && typeof record === "object" && "secret" in record && !record.legacySecret) record.legacySecret = record.secret;
  }
  const envKey = {
    algorithm: "Ed25519",
    publicKey: env.accessTokenSigningPublicKey,
    privateKey: env.accessTokenSigningPrivateKey,
    keyStore: env.accessTokenSigningKeyStore,
    createdAt: nowIso(),
    status: "active",
    signerIdentity: env.accessTokenSignerIdentity,
    signerDisplayName: env.accessTokenSignerDisplayName,
    signerVersion: env.accessTokenSignerVersion,
    publicKeyFingerprint: createKeyFingerprint(env.accessTokenSigningPublicKey),
  };
  if (!keys[env.accessTokenSigningKeyId]) keys[env.accessTokenSigningKeyId] = envKey;
  let activeKeyId = String(keyManagement.activeKeyId || Object.keys(keys)[0] || env.accessTokenSigningKeyId);
  const activeKey = keys[activeKeyId];
  if (!activeKey || !activeKey.publicKey || !activeKey.privateKey) {
    activeKeyId = env.accessTokenSigningKeyId;
    keys[activeKeyId] = { ...envKey, ...(keys[activeKeyId] || {}) };
  }
  return {
    ...security,
    sessionSigning: {
      algorithm: keyManagement.algorithm || "Ed25519",
      keyStore: keyManagement.keyStore || env.accessTokenSigningKeyStore,
      activeKeyId,
      previousKeyIds: Array.isArray(keyManagement.previousKeyIds) ? keyManagement.previousKeyIds.filter((item: unknown) => typeof item === "string" && item !== activeKeyId) : Object.keys(keys).filter((item) => item !== activeKeyId),
      lastRotatedAt: typeof keyManagement.lastRotatedAt === "string" ? keyManagement.lastRotatedAt : (keys[activeKeyId]?.createdAt || nowIso()),
      rotation: {
        recommendedDays: Number(keyManagement.rotation?.recommendedDays || 90),
        nextRotationReviewAt: typeof keyManagement.rotation?.nextRotationReviewAt === "string" ? keyManagement.rotation.nextRotationReviewAt : null,
        procedure: typeof keyManagement.rotation?.procedure === "string" ? keyManagement.rotation.procedure : "Provision a new asymmetric signing key, publish verifier metadata, promote the new kid, and retain prior public keys for verification until all active sessions expire.",
      },
      keys,
    },
  };
}

export function signWithPrivateKey(privateKeyPem: string, input: string): string {
  return crypto.sign(null, Buffer.from(input), crypto.createPrivateKey(privateKeyPem)).toString("base64url");
}

export function verifyWithPublicKey(publicKeyPem: string, input: string, signature: string): boolean {
  try {
    return crypto.verify(null, Buffer.from(input), crypto.createPublicKey(publicKeyPem), Buffer.from(signature, "base64url"));
  } catch {
    return false;
  }
}
