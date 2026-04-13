import crypto from "node:crypto";
import { importPKCS8, importSPKI, jwtVerify, SignJWT, type JWTPayload, type KeyLike, type JWTHeaderParameters } from "jose";
import { env } from "../../config/env.js";
import type { AppUser } from "../../models/domain.js";
import { DEFAULT_TENANT_ID, DEFAULT_TRUST_ID, normalizeTrustIds } from "../../services/tenancy.service.js";
import { authKeyRepository } from "./key-repository.js";

export interface AccessTokenHeader extends JWTHeaderParameters {
  alg: "EdDSA";
  typ: "at+jwt";
  kid: string;
  sid: string | null;
  sks: string;
  signer: { identity: string; version: string; displayName: string | null };
}
export interface AccessTokenClaims extends JWTPayload {
  iss: string;
  aud: string;
  sub: string;
  tid: string;
  trids: string[];
  trid: string;
  sid: string | null;
  jti: string;
  iat: number;
  nbf: number;
  exp: number;
  sv: number;
  type: "access";
}
export interface VerifiedAccessToken {
  header: AccessTokenHeader;
  claims: AccessTokenClaims;
}

export class AccessTokenService {
  static readonly CLOCK_SKEW_SECONDS = 30;
  private readonly privateKeyCache = new Map<string, Promise<KeyLike>>();
  private readonly publicKeyCache = new Map<string, Promise<KeyLike>>();

  private claimNow() { return Math.floor(Date.now() / 1000); }

  private getPrivateKey(privateKeyPem: string) {
    if (!this.privateKeyCache.has(privateKeyPem)) this.privateKeyCache.set(privateKeyPem, importPKCS8(privateKeyPem, "EdDSA"));
    return this.privateKeyCache.get(privateKeyPem)!;
  }

  private getPublicKey(publicKeyPem: string) {
    if (!this.publicKeyCache.has(publicKeyPem)) this.publicKeyCache.set(publicKeyPem, importSPKI(publicKeyPem, "EdDSA"));
    return this.publicKeyCache.get(publicKeyPem)!;
  }

  async issue(user: AppUser, sessionId: string | null = null): Promise<string> {
    const now = this.claimNow();
    const keyId = authKeyRepository.getActiveSessionSigningKeyId();
    const signingKey = authKeyRepository.getActiveSessionSigningKey();
    const claims: AccessTokenClaims = {
      iss: env.accessTokenIssuer,
      aud: env.accessTokenAudience,
      sub: user.id,
      tid: user.tenantId || DEFAULT_TENANT_ID,
      trids: normalizeTrustIds(user.trustIds || [user.activeTrustId || DEFAULT_TRUST_ID]),
      trid: user.activeTrustId || DEFAULT_TRUST_ID,
      sid: sessionId,
      jti: crypto.randomUUID(),
      iat: now,
      nbf: now,
      exp: now + env.accessTokenTtlSeconds,
      sv: user.sessionVersion || 1,
      type: "access",
    };
    const header: AccessTokenHeader = {
      alg: "EdDSA",
      typ: "at+jwt",
      kid: keyId,
      sid: sessionId,
      sks: authKeyRepository.getSessionSigningState().keyStore,
      signer: { identity: signingKey.signerIdentity, version: signingKey.signerVersion, displayName: signingKey.signerDisplayName || null },
    };

    return new SignJWT({ tid: claims.tid, trids: claims.trids, trid: claims.trid, sid: claims.sid, sv: claims.sv, type: claims.type })
      .setProtectedHeader(header as JWTHeaderParameters)
      .setIssuer(claims.iss)
      .setAudience(claims.aud)
      .setSubject(claims.sub)
      .setJti(claims.jti)
      .setIssuedAt(claims.iat)
      .setNotBefore(claims.nbf)
      .setExpirationTime(claims.exp)
      .sign(await this.getPrivateKey(signingKey.privateKey || env.accessTokenSigningPrivateKey));
  }

  private hasValidEnvelope(header: Partial<AccessTokenHeader>) {
    return header.alg === "EdDSA" && header.typ === "at+jwt" && typeof header.kid === "string" && header.kid.length > 0;
  }

  private isStringArray(value: unknown): value is string[] {
    return Array.isArray(value) && value.every((item) => typeof item === "string" && item.length > 0);
  }

  private normalizeClaims(payload: JWTPayload): AccessTokenClaims | null {
    if (typeof payload.iss !== "string" || typeof payload.aud !== "string" || typeof payload.sub !== "string") return null;
    if (typeof payload.jti !== "string" || typeof payload.iat !== "number" || typeof payload.nbf !== "number" || typeof payload.exp !== "number") return null;
    if (typeof payload.tid !== "string" || typeof payload.trid !== "string") return null;
    if (!this.isStringArray(payload.trids)) return null;
    if (payload.sid !== null && payload.sid !== undefined && typeof payload.sid !== "string") return null;
    if (typeof payload.sv !== "number" || payload.type !== "access") return null;
    return { iss: payload.iss, aud: payload.aud, sub: payload.sub, tid: payload.tid, trids: payload.trids, trid: payload.trid, sid: payload.sid ?? null, jti: payload.jti, iat: payload.iat, nbf: payload.nbf, exp: payload.exp, sv: payload.sv, type: "access" };
  }

  async verifyAndDecode(token?: string | null): Promise<VerifiedAccessToken | null> {
    if (!token) return null;
    const headerOnly = this.decodeProtectedHeader(token);
    if (!headerOnly || !this.hasValidEnvelope(headerOnly)) return null;
    const keyId = headerOnly.kid;
    if (typeof keyId !== "string" || !keyId) return null;
    const keyRecord = authKeyRepository.getSessionSigningKey(keyId);
    if (!keyRecord?.publicKey) return null;
    if (keyRecord.status && keyRecord.status !== "active" && keyRecord.status !== "retiring") return null;

    try {
      const verified = await jwtVerify(token, await this.getPublicKey(keyRecord.publicKey), {
        issuer: env.accessTokenIssuer,
        audience: env.accessTokenAudience,
        typ: "at+jwt",
        algorithms: ["EdDSA"],
        clockTolerance: AccessTokenService.CLOCK_SKEW_SECONDS,
      });
      const header = verified.protectedHeader as AccessTokenHeader;
      const claims = this.normalizeClaims(verified.payload);
      if (!claims) return null;
      if (header.signer?.identity !== keyRecord.signerIdentity) return null;
      if (String(header.signer?.version || "") !== String(keyRecord.signerVersion || "")) return null;
      if (header.sks !== keyRecord.keyStore) return null;
      return { header, claims };
    } catch {
      return null;
    }
  }

  private decodeProtectedHeader(token: string): Partial<AccessTokenHeader> | null {
    const [headerEncoded] = token.split(".");
    if (!headerEncoded) return null;
    try {
      return JSON.parse(Buffer.from(headerEncoded, "base64url").toString("utf8")) as Partial<AccessTokenHeader>;
    } catch {
      return null;
    }
  }
}
export const accessTokenService = new AccessTokenService();
