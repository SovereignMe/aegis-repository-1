import crypto from "node:crypto";
import { env } from "../../config/env.js";

export type ManagedSignerKind = "evidence" | "metadata";

function canonicalizeValue(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalizeValue(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalizeValue(item)}`).join(",")}}`;
}

function toPemBody(key: string) {
  return key.trim().replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "").replace(/\s+/g, "");
}

function asPublicFingerprint(publicKeyPem: string) {
  const der = Buffer.from(toPemBody(publicKeyPem), "base64");
  return crypto.createHash("sha256").update(der).digest("hex");
}

function loadManagedSigner(kind: ManagedSignerKind) {
  const config = kind === "evidence" ? {
    keyId: env.evidenceSigningKeyId,
    signerIdentity: env.evidenceSignerIdentity,
    signerDisplayName: env.evidenceSignerDisplayName,
    keyStore: env.evidenceSigningKeyStore,
    privateKey: env.evidenceSigningPrivateKey,
    publicKey: env.evidenceSigningPublicKey,
  } : {
    keyId: env.fileMetadataSigningKeyId,
    signerIdentity: env.fileMetadataSignerIdentity,
    signerDisplayName: env.fileMetadataSignerDisplayName,
    keyStore: env.fileMetadataSigningKeyStore,
    privateKey: env.fileMetadataSigningPrivateKey,
    publicKey: env.fileMetadataSigningPublicKey,
  };
  const privateKey = crypto.createPrivateKey(config.privateKey);
  const publicKey = crypto.createPublicKey(config.publicKey);
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  return {
    kind,
    algorithm: "Ed25519",
    keyId: config.keyId,
    signer: {
      identity: config.signerIdentity,
      displayName: config.signerDisplayName,
      keyStore: config.keyStore,
    },
    privateKey,
    publicKey,
    publicKeyPem,
    publicKeyFingerprint: asPublicFingerprint(publicKeyPem),
  };
}

export function canonicalizeForSignature(value: unknown): string {
  return canonicalizeValue(value);
}

export function getManagedSignerSummary(kind: ManagedSignerKind) {
  const signer = loadManagedSigner(kind);
  return {
    algorithm: signer.algorithm,
    activeKeyId: signer.keyId,
    signer: signer.signer,
    publicKeyFingerprint: signer.publicKeyFingerprint,
    publicKeyPem: signer.publicKeyPem,
  };
}

export function createDetachedSignature(kind: ManagedSignerKind, scope: string, payload: unknown, signedAt = new Date().toISOString()) {
  const signer = loadManagedSigner(kind);
  const canonicalPayload = canonicalizeForSignature(payload);
  const signature = crypto.sign(null, Buffer.from(canonicalPayload), signer.privateKey).toString("base64");
  return {
    algorithm: signer.algorithm,
    keyId: signer.keyId,
    scope,
    signature,
    signedAt,
    signer: signer.signer,
    signerIdentity: signer.signer.identity,
    publicKeyFingerprint: signer.publicKeyFingerprint,
    publicKeyPem: signer.publicKeyPem,
  };
}

export function verifyDetachedSignature(payload: unknown, signature: string, publicKeyPem: string) {
  const publicKey = crypto.createPublicKey(publicKeyPem);
  return crypto.verify(null, Buffer.from(canonicalizeForSignature(payload)), publicKey, Buffer.from(signature, "base64"));
}
