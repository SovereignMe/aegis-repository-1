import { env } from '../../config/env.js';
import { db } from '../../store/governance-store.js';
import { createKeyFingerprint, normalizeEd25519KeyPair, nowIso } from './crypto-helpers.js';

export interface SessionSigningKeyRecord {
  algorithm: 'Ed25519' | string;
  publicKey: string;
  privateKey?: string;
  keyStore: string;
  createdAt: string;
  status: string;
  signerIdentity: string;
  signerDisplayName?: string;
  signerVersion: string;
  publicKeyFingerprint: string;
  legacySecret?: string;
}

export interface SessionSigningState {
  algorithm: string;
  keyStore: string;
  activeKeyId: string;
  previousKeyIds: string[];
  lastRotatedAt: string | null;
  rotation: { recommendedDays: number; nextRotationReviewAt: string | null; procedure?: string | null };
  keys: Record<string, SessionSigningKeyRecord>;
}

export class AuthKeyRepository {
  private getNormalizedEnvKeyPair() {
    return normalizeEd25519KeyPair(
      { publicKey: env.accessTokenSigningPublicKey, privateKey: env.accessTokenSigningPrivateKey },
      { allowRepair: !env.isProduction, strictLabel: 'ACCESS_TOKEN_SIGNING_KEY' },
    );
  }

  getSecuritySettings(): Record<string, any> {
    const security = ((db.settings as Record<string, any>)?.security || {}) as Record<string, any>;
    const keyManagement = security.sessionSigning || {};
    const keys = { ...(keyManagement.keys || {}) } as Record<string, any>;
    for (const [, record] of Object.entries(keys)) {
      if (record && typeof record === 'object' && 'secret' in record && !record.legacySecret) record.legacySecret = record.secret as string;
    }
    const normalizedEnvKeyPair = this.getNormalizedEnvKeyPair();
    const envKey: SessionSigningKeyRecord = {
      algorithm: 'Ed25519',
      publicKey: normalizedEnvKeyPair.publicKey,
      privateKey: normalizedEnvKeyPair.privateKey || undefined,
      keyStore: env.accessTokenSigningKeyStore,
      createdAt: nowIso(),
      status: 'active',
      signerIdentity: env.accessTokenSignerIdentity,
      signerDisplayName: env.accessTokenSignerDisplayName,
      signerVersion: env.accessTokenSignerVersion,
      publicKeyFingerprint: createKeyFingerprint(normalizedEnvKeyPair.publicKey),
    };
    if (!keys[env.accessTokenSigningKeyId]) keys[env.accessTokenSigningKeyId] = envKey;
    let activeKeyId = String(keyManagement.activeKeyId || Object.keys(keys)[0] || env.accessTokenSigningKeyId);
    const activeKey = keys[activeKeyId] as SessionSigningKeyRecord | undefined;
    if (!activeKey || !activeKey.publicKey || !activeKey.privateKey) {
      activeKeyId = env.accessTokenSigningKeyId;
      keys[activeKeyId] = { ...envKey, ...(keys[activeKeyId] || {}) };
    }
    return {
      ...security,
      sessionSigning: {
        algorithm: keyManagement.algorithm || 'Ed25519',
        keyStore: keyManagement.keyStore || env.accessTokenSigningKeyStore,
        activeKeyId,
        previousKeyIds: Array.isArray(keyManagement.previousKeyIds) ? keyManagement.previousKeyIds.filter((item: unknown) => typeof item === 'string' && item !== activeKeyId) : Object.keys(keys).filter((item) => item !== activeKeyId),
        lastRotatedAt: typeof keyManagement.lastRotatedAt === 'string' ? keyManagement.lastRotatedAt : (keys[activeKeyId]?.createdAt || nowIso()),
        rotation: {
          recommendedDays: Number(keyManagement.rotation?.recommendedDays || 90),
          nextRotationReviewAt: typeof keyManagement.rotation?.nextRotationReviewAt === 'string' ? keyManagement.rotation.nextRotationReviewAt : null,
          procedure: typeof keyManagement.rotation?.procedure === 'string' ? keyManagement.rotation.procedure : 'Provision a new asymmetric signing key, publish verifier metadata, promote the new kid, and retain prior public keys for verification until all active sessions expire.',
        },
        keys,
      },
    };
  }

  getSessionSigningState(): SessionSigningState {
    return this.getSecuritySettings().sessionSigning as SessionSigningState;
  }

  getActiveSessionSigningKeyId(): string {
    return String(this.getSessionSigningState().activeKeyId || env.accessTokenSigningKeyId);
  }

  getSessionSigningKey(keyId: string): SessionSigningKeyRecord | null {
    return this.getSessionSigningState().keys?.[keyId] || null;
  }

  getActiveSessionSigningKey(): SessionSigningKeyRecord {
    const normalizedEnvKeyPair = this.getNormalizedEnvKeyPair();
    return this.getSessionSigningKey(this.getActiveSessionSigningKeyId()) || {
      algorithm: 'Ed25519',
      publicKey: normalizedEnvKeyPair.publicKey,
      privateKey: normalizedEnvKeyPair.privateKey || undefined,
      keyStore: env.accessTokenSigningKeyStore,
      createdAt: nowIso(),
      status: 'active',
      signerIdentity: env.accessTokenSignerIdentity,
      signerDisplayName: env.accessTokenSignerDisplayName,
      signerVersion: env.accessTokenSignerVersion,
      publicKeyFingerprint: createKeyFingerprint(normalizedEnvKeyPair.publicKey),
    };
  }
}

export const authKeyRepository = new AuthKeyRepository();
