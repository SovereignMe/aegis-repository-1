import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), ".env.local"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), "../.env.local"),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

function fromFile(key: string): string | undefined {
  const filePath = process.env[`${key}_FILE`];
  if (!filePath) return undefined;
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return undefined;
  }
}

function rawValue(key: string): string | undefined {
  return process.env[key] ?? fromFile(key);
}

function required(key: string, fallback?: string): string {
  const value = rawValue(key) ?? fallback;
  if (!value) throw new Error(`${key} is required for this runtime path.`);
  return value;
}

function optional(key: string, fallback?: string): string | undefined {
  return rawValue(key) ?? fallback;
}

function boolean(key: string, fallback = false): boolean {
  const v = rawValue(key);
  if (v === undefined) return fallback;
  return ["true", "1", "yes", "on"].includes(String(v).toLowerCase());
}

function number(key: string, fallback: number): number {
  const v = rawValue(key);
  if (!v) return fallback;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function list(key: string, fallback: string[] = []): string[] {
  const v = rawValue(key);
  if (!v) return fallback;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

const nodeEnv = optional("NODE_ENV", "development")!;
const isProduction = nodeEnv === "production";
const isTestMode = boolean("AEGIS_TEST_MODE", false) || process.env.NODE_ENV === "test";
const frontendOrigin = optional("FRONTEND_ORIGIN", optional("ALLOWED_ORIGINS", "http://localhost:5173")!.split(",")[0].trim())!;
const databaseUrl = isTestMode ? "" : optional("DATABASE_URL", "postgres://postgres:password@localhost:5432/hlh_trust_governance")!;

export const env = {
  nodeEnv,
  isProduction,
  isTestMode,
  port: number("PORT", 3001),

  appName: optional("APP_NAME", "AEGIS Trust Governance")!,
  appBaseUrl: required("APP_BASE_URL", "http://localhost:3001"),
  frontendOrigin,
  allowedOrigins: list("ALLOWED_ORIGINS", [frontendOrigin]),

  databaseUrl,
  storageMode: optional("STORAGE_MODE", isTestMode ? "file" : "postgres")!,

  sessionSecret: required("SESSION_SECRET", "dev-session-secret-change-me"),
  jwtSecret: required("JWT_SECRET", optional("SESSION_SECRET", "dev-session-secret-change-me")),
  accessTokenSecret: required("ACCESS_TOKEN_SECRET", "dev-access-token-secret-change-me"),
  refreshTokenSecret: required("REFRESH_TOKEN_SECRET", "dev-refresh-token-secret-change-me"),
  bootstrapApiKey: required("BOOTSTRAP_API_KEY", "dev-bootstrap-api-key-change-me"),

  allowSelfRegistration: boolean("ALLOW_SELF_REGISTRATION", false),

  dataDir: optional("DATA_DIR", "./data")!,
  stateFile: optional("STATE_FILE", "./data/local-state.json")!,
  uploadsDir: optional("UPLOADS_DIR", "./data/uploads")!,
  quarantineDir: optional("QUARANTINE_DIR", "./data/quarantine")!,
  uploadTempDir: optional("UPLOAD_TEMP_DIR", "./data/upload-temp")!,
  evidenceBundlesDir: optional("EVIDENCE_BUNDLES_DIR", "./data/evidence")!,

  uploadMaxBytes: number("UPLOAD_MAX_BYTES", number("MAX_UPLOAD_MB", 50) * 1024 * 1024),
  bodyLimitBytes: number("BODY_LIMIT_MB", 10) * 1024 * 1024,

  allowedUploadMimeTypes: list("ALLOWED_UPLOAD_MIME_TYPES", ["application/pdf", "image/png", "image/jpeg", "text/plain"]),
  allowedUploadExtensions: list("ALLOWED_UPLOAD_EXTENSIONS", [".pdf", ".png", ".jpg", ".jpeg", ".txt"]),

  cookieSecure: boolean("COOKIE_SECURE", false),
  cookieSameSite: optional("COOKIE_SAME_SITE", "lax")!,
  cookieDomain: optional("COOKIE_DOMAIN"),
  trustProxy: boolean("TRUST_PROXY", false),
  trustedProxyCidrs: list("TRUSTED_PROXY_CIDRS"),

  logLevel: optional("LOG_LEVEL", "info")!,
  metricsEnabled: boolean("METRICS_ENABLED", false),
  metricsAccessMode: optional("METRICS_ACCESS_MODE", "admin"),

  refreshCookieName: optional("REFRESH_COOKIE_NAME", "hlh_refresh_token")!,
  refreshTokenTtlSeconds: number("REFRESH_TOKEN_TTL_SECONDS", 60 * 60 * 24 * 14),
  accessTokenTtlSeconds: number("ACCESS_TOKEN_TTL_SECONDS", 60 * 15),
  accessTokenIssuer: optional("ACCESS_TOKEN_ISSUER", "aegis-auth")!,
  accessTokenAudience: optional("ACCESS_TOKEN_AUDIENCE", "aegis-frontend")!,
  accessTokenSigningKeyId: required("ACCESS_TOKEN_SIGNING_KEY_ID", "access-ed25519-k1"),
  accessTokenSigningKeyStore: required("ACCESS_TOKEN_SIGNING_KEY_STORE", "managed-env"),
  accessTokenSigningPrivateKey: required("ACCESS_TOKEN_SIGNING_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIJ2vlP4hF4fBEt8s5hO6pMbrKgJGdwNwp0UrEGouGZWl\n-----END PRIVATE KEY-----"),
  accessTokenSigningPublicKey: required("ACCESS_TOKEN_SIGNING_PUBLIC_KEY", "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAV+5sQn2ATmNnS/xP8s3HdWu3UwG+329xNX1/SuKD5d8=\n-----END PUBLIC KEY-----"),
  accessTokenSignerIdentity: required("ACCESS_TOKEN_SIGNER_IDENTITY", "urn:aegis:service:access-token-signer"),
  accessTokenSignerDisplayName: required("ACCESS_TOKEN_SIGNER_DISPLAY_NAME", "AEGIS Access Token Signer"),
  accessTokenSignerVersion: required("ACCESS_TOKEN_SIGNER_VERSION", "1"),

  evidenceSigningKeyId: required("EVIDENCE_SIGNING_KEY_ID", "evidence-ed25519-k1"),
  evidenceSignerIdentity: required("EVIDENCE_SIGNER_IDENTITY", "urn:aegis:service:evidence-signer"),
  evidenceSignerDisplayName: required("EVIDENCE_SIGNER_DISPLAY_NAME", "AEGIS Evidence Signer"),
  evidenceSigningKeyStore: required("EVIDENCE_SIGNING_KEY_STORE", "managed-env"),
  evidenceSigningPrivateKey: required("EVIDENCE_SIGNING_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIJ2vlP4hF4fBEt8s5hO6pMbrKgJGdwNwp0UrEGouGZWl\n-----END PRIVATE KEY-----"),
  evidenceSigningPublicKey: required("EVIDENCE_SIGNING_PUBLIC_KEY", "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAV+5sQn2ATmNnS/xP8s3HdWu3UwG+329xNX1/SuKD5d8=\n-----END PUBLIC KEY-----"),

  fileMetadataSigningKeyId: required("FILE_METADATA_SIGNING_KEY_ID", "metadata-ed25519-k1"),
  fileMetadataSignerIdentity: required("FILE_METADATA_SIGNER_IDENTITY", "urn:aegis:service:file-metadata-signer"),
  fileMetadataSignerDisplayName: required("FILE_METADATA_SIGNER_DISPLAY_NAME", "AEGIS File Metadata Signer"),
  fileMetadataSigningKeyStore: required("FILE_METADATA_SIGNING_KEY_STORE", "managed-env"),
  fileMetadataSigningPrivateKey: required("FILE_METADATA_SIGNING_PRIVATE_KEY", "-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIJ2vlP4hF4fBEt8s5hO6pMbrKgJGdwNwp0UrEGouGZWl\n-----END PRIVATE KEY-----"),
  fileMetadataSigningPublicKey: required("FILE_METADATA_SIGNING_PUBLIC_KEY", "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAV+5sQn2ATmNnS/xP8s3HdWu3UwG+329xNX1/SuKD5d8=\n-----END PUBLIC KEY-----"),

  gmailOAuthEnabled: boolean("ENABLE_GMAIL_INTEGRATION", false),
  googleCalendarOAuthEnabled: boolean("ENABLE_GOOGLE_CALENDAR_INTEGRATION", false),
  cloudSyncEnabled: boolean("ENABLE_CLOUD_SYNC_INTEGRATION", false),

  rateLimitWindowMs: number("RATE_LIMIT_WINDOW_MS", 60_000),
  maxRequestsPerWindow: number("RATE_LIMIT_MAX_REQUESTS", 240),
  loginMaxAttempts: number("LOGIN_MAX_ATTEMPTS", 5),
  loginWindowMs: number("LOGIN_WINDOW_MS", 15 * 60 * 1000),
  loginBlockMs: number("LOGIN_BLOCK_MS", 15 * 60 * 1000),

  enableIndexing: boolean("ENABLE_INDEXING", false),
  enableOcr: boolean("ENABLE_OCR", false),
  indexingCommand: optional("INDEXING_COMMAND"),
  ocrCommand: optional("OCR_COMMAND"),
  malwareScanCommand: optional("MALWARE_SCAN_COMMAND"),
  evidenceTimestampMode: optional("EVIDENCE_TIMESTAMP_MODE", "internal")!,
  evidenceTimestampProvider: optional("EVIDENCE_TIMESTAMP_PROVIDER", "internal")!,
  evidenceTimestampAuthorityUrl: optional("EVIDENCE_TIMESTAMP_AUTHORITY_URL"),
  evidenceTimestampCommand: optional("EVIDENCE_TIMESTAMP_COMMAND"),
  evidenceAnchorCommand: optional("EVIDENCE_ANCHOR_COMMAND"),

  legacyAdminEmail: optional("ADMIN_EMAIL", ""),
  legacyAdminPassword: optional("ADMIN_PASSWORD", ""),

  contentSecurityPolicy: optional("CONTENT_SECURITY_POLICY"),
  cspReportOnly: boolean("CSP_REPORT_ONLY", false),

  local: {
    trustedProxyCidrs: list("TRUSTED_PROXY_CIDRS"),
  },
  config: {
    frontendOrigin,
  },
  js: {},
};

if (process.env.DEBUG_ENV === "true") {
  console.log("ENV VALUE DEBUG", {
    DATABASE_URL: env.databaseUrl ? "SET" : "MISSING",
    SESSION_SECRET: env.sessionSecret ? "SET" : "MISSING",
    BOOTSTRAP_API_KEY: env.bootstrapApiKey ? "SET" : "MISSING",
  });
}
