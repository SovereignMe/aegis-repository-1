import { env } from "../config/env.js";
import { db } from "../store/governance-store.js";

export type ProductionReadinessCheck = {
  key: string;
  status: "pass" | "fail" | "warn";
  detail: string;
};

function isPlaceholder(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;
  return normalized.includes("change-me") || normalized.includes("development-") || normalized.includes("local-");
}

function createChecks() {
  const settings = (db.settings as Record<string, any>) || {};
  const security = (settings.security as Record<string, any>) || {};
  const recordsGovernance = (settings.recordsGovernance as Record<string, any>) || {};
  const platformBoundary = (settings.platformBoundary as Record<string, any>) || {};
  const storage = db.getStorageMeta();

  const checks: ProductionReadinessCheck[] = [
    {
      key: "storage-mode",
      status: env.storageMode === "postgres" ? "pass" : "fail",
      detail: env.storageMode === "postgres"
        ? "Runtime storage is backed by Postgres."
        : "Production and staging must not run in file-backed persistence mode.",
    },
    {
      key: "storage-meta",
      status: storage.mode === "postgres" ? "pass" : "fail",
      detail: `Active store reports ${storage.mode} persistence at ${storage.location}.`,
    },
    {
      key: "self-registration",
      status: security.allowSelfRegistration === false ? "pass" : "fail",
      detail: security.allowSelfRegistration === false
        ? "Self-registration is disabled."
        : "Self-registration must be disabled for production governance operations.",
    },
    {
      key: "admin-mfa",
      status: security.requireAdminMfa !== false ? "pass" : "fail",
      detail: security.requireAdminMfa !== false
        ? "Administrator MFA is required."
        : "Administrator MFA must be required in production.",
    },
    {
      key: "platform-boundary",
      status: platformBoundary.legalAdjudicationEnabled === false ? "pass" : "warn",
      detail: platformBoundary.legalAdjudicationEnabled === false
        ? "Administrative-governance boundary remains in force."
        : "Legal adjudication should remain disabled unless governance policy explicitly changes.",
    },
    {
      key: "timestamp-mode",
      status: recordsGovernance.trustedTimestamp?.enabled ? "pass" : "warn",
      detail: recordsGovernance.trustedTimestamp?.enabled
        ? `Trusted timestamping enabled via ${recordsGovernance.trustedTimestamp?.provider || env.evidenceTimestampProvider}.`
        : "Trusted timestamping is not enabled.",
    },
    {
      key: "legacy-admin-bootstrap",
      status: !env.legacyAdminEmail && !env.legacyAdminPassword ? "pass" : "warn",
      detail: !env.legacyAdminEmail && !env.legacyAdminPassword
        ? "Legacy seeded admin credentials are not configured."
        : "Legacy admin bootstrap values are present. Remove them for production deployments.",
    },
    {
      key: "signing-identities",
      status: [
        env.accessTokenSignerIdentity,
        env.fileMetadataSignerIdentity,
        env.evidenceSignerIdentity,
      ].every((value) => !isPlaceholder(value)) ? "pass" : "fail",
      detail: "Signer identities must be explicit and non-placeholder for access, metadata, and evidence signing.",
    },
  ];

  return checks;
}

export function getProductionReadinessReport() {
  const checks = createChecks();
  const failed = checks.filter((item) => item.status === "fail");
  const warnings = checks.filter((item) => item.status === "warn");

  return {
    mode: env.nodeEnv,
    productionStrict: env.isProduction,
    storage: db.getStorageMeta(),
    summary: {
      failed: failed.length,
      warnings: warnings.length,
      passed: checks.filter((item) => item.status === "pass").length,
      ready: failed.length === 0,
    },
    checks,
  };
}

export function assertProductionRuntimeReady() {
  const report = getProductionReadinessReport();
  const isTestMode = process.env.AEGIS_TEST_MODE === "1";
  if (env.isProduction && !isTestMode && !report.summary.ready) {
    const failureSummary = report.checks
      .filter((item) => item.status === "fail")
      .map((item) => `${item.key}: ${item.detail}`)
      .join(" | ");
    throw new Error(`Production readiness checks failed. ${failureSummary}`);
  }
  return report;
}
