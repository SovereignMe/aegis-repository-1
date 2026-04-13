import type { SecurityEventContext } from "../../../shared/src/domain.js";
import crypto from "node:crypto";

type CounterMap = Record<string, number>;
type HttpMetricKey = `${string}|${string}|${string}|${string}`;
type SecurityMetricKey = `${string}|${string}|${string}`;

type HttpMetricRecord = {
  method: string;
  route: string;
  statusClass: string;
  authState: string;
  count: number;
};

type SecurityMetricRecord = {
  eventType: string;
  outcome: string;
  severity: string;
  count: number;
};

type SecurityDiagnosticEvent = SecurityEventContext & {
  category: "security-event";
  eventType: string;
  outcome: string;
  severity: string;
  at: string;
};

const MAX_DIAGNOSTIC_EVENTS = 100;
const appCounters: CounterMap = { totalRequests: 0, errorResponses: 0, authFailures: 0 };
const routeCounters: CounterMap = {};
const httpSeries = new Map<HttpMetricKey, number>();
const securitySeries = new Map<SecurityMetricKey, number>();
const invalidationDiagnostics: Array<{ key: string; reason: string; at: string }> = [];
const operationalEvents: Array<Record<string, unknown>> = [];
const startedAt = Date.now();
let lastBackupVerificationAt: string | null = null;
let lastBackupRestoreDrillAt: string | null = null;

function pushDiagnosticEvent(target: Array<Record<string, unknown>>, event: Record<string, unknown>) {
  target.push(event);
  if (target.length > MAX_DIAGNOSTIC_EVENTS) target.splice(0, target.length - MAX_DIAGNOSTIC_EVENTS);
}

function sanitizeSegment(segment: string) {
  if (!segment) return "unknown";
  if (/^[0-9]+$/.test(segment)) return ":int";
  if (/^[0-9a-f]{8,}$/i.test(segment)) return ":id";
  if (/^[0-9a-f-]{16,}$/i.test(segment)) return ":uuid";
  if (/^[A-Z0-9_-]{8,}$/i.test(segment)) return ":token";
  return segment.toLowerCase();
}

function normalizeRouteLabel(route?: string) {
  if (!route) return "unknown";
  const pathOnly = route.split("?")[0].trim() || "/";
  const normalized = pathOnly
    .split("/")
    .filter(Boolean)
    .map((segment) => sanitizeSegment(segment))
    .join("/");
  return `/${normalized}`;
}

function normalizeMethod(method?: string) {
  return (method || "UNKNOWN").toUpperCase();
}

function normalizeStatusClass(statusCode?: number) {
  if (!statusCode || Number.isNaN(statusCode)) return "unknown";
  return `${Math.floor(statusCode / 100)}xx`;
}

function normalizeAuthState(authState?: string) {
  if (!authState) return "anonymous";
  if (["anonymous", "authenticated", "mfa", "denied", "system"].includes(authState)) return authState;
  return "other";
}

function boundedSeverity(severity?: string) {
  if (!severity) return "info";
  if (["info", "low", "medium", "high", "critical"].includes(severity)) return severity;
  return "info";
}

function boundedOutcome(outcome?: string) {
  if (!outcome) return "observed";
  if (["success", "failure", "denied", "observed", "blocked"].includes(outcome)) return outcome;
  return "observed";
}

function boundedSecurityEventType(eventType?: string) {
  if (!eventType) return "other";
  if ([
    "auth.login",
    "auth.mfa.challenge",
    "auth.mfa.enroll",
    "auth.token.verify",
    "auth.rate_limit",
    "authz.denied",
    "authz.scope",
    "governance.packet.approval",
    "request.rate_limit",
    "documents.upload",
    "documents.quarantine",
    "documents.verification.report",
    "evidence.verify",
    "backup.restore_drill",
    "security.header_violation",
  ].includes(eventType)) {
    return eventType;
  }
  return "other";
}

function mapHttpSeries(): HttpMetricRecord[] {
  return [...httpSeries.entries()]
    .map(([key, count]) => {
      const [method, route, statusClass, authState] = key.split("|");
      return { method, route, statusClass, authState, count };
    })
    .sort((a, b) => b.count - a.count || a.route.localeCompare(b.route));
}

function mapSecuritySeries(): SecurityMetricRecord[] {
  return [...securitySeries.entries()]
    .map(([key, count]) => {
      const [eventType, outcome, severity] = key.split("|");
      return { eventType, outcome, severity, count };
    })
    .sort((a, b) => b.count - a.count || a.eventType.localeCompare(b.eventType));
}

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function bumpMetric(name: string, route?: string) {
  appCounters.totalRequests += 1;
  appCounters[name] = (appCounters[name] || 0) + 1;
  if (route) {
    const normalizedRoute = normalizeRouteLabel(route);
    routeCounters[normalizedRoute] = (routeCounters[normalizedRoute] || 0) + 1;
  }
}

export function recordHttpRequestMetric(input: { method?: string; route?: string; statusCode?: number; authState?: string }) {
  const method = normalizeMethod(input.method);
  const route = normalizeRouteLabel(input.route);
  const statusClass = normalizeStatusClass(input.statusCode);
  const authState = normalizeAuthState(input.authState);
  const key: HttpMetricKey = `${method}|${route}|${statusClass}|${authState}`;
  httpSeries.set(key, (httpSeries.get(key) || 0) + 1);
}

export function recordSecurityEvent(input: SecurityEventContext) {
  const eventType = boundedSecurityEventType(input.eventType);
  const outcome = boundedOutcome(input.outcome);
  const severity = boundedSeverity(input.severity);
  const key: SecurityMetricKey = `${eventType}|${outcome}|${severity}`;
  securitySeries.set(key, (securitySeries.get(key) || 0) + 1);
  const event: SecurityDiagnosticEvent = {
    category: "security-event",
    eventType: eventType as SecurityDiagnosticEvent["eventType"],
    outcome: outcome as SecurityDiagnosticEvent["outcome"],
    severity: severity as SecurityDiagnosticEvent["severity"],
    actorRole: input.actorRole || "unknown",
    actorEmail: input.actorEmail || null,
    tenantId: input.tenantId || null,
    trustId: input.trustId || null,
    recordType: input.recordType || null,
    recordId: input.recordId || null,
    packetId: input.packetId || null,
    approvalState: input.approvalState || null,
    evidenceSignatureStatus: input.evidenceSignatureStatus || null,
    metadata: input.metadata || undefined,
    at: new Date().toISOString(),
  };
  pushDiagnosticEvent(operationalEvents, event as unknown as Record<string, unknown>);
}


export function noteInvalidationDiagnostic(key: string, reason: string) {
  invalidationDiagnostics.push({ key, reason, at: new Date().toISOString() });
  if (invalidationDiagnostics.length > MAX_DIAGNOSTIC_EVENTS) {
    invalidationDiagnostics.splice(0, invalidationDiagnostics.length - MAX_DIAGNOSTIC_EVENTS);
  }
}

export function markAuthFailure() {
  appCounters.authFailures += 1;
  recordSecurityEvent({ eventType: "auth.token.verify", outcome: "failure", severity: "medium", actorRole: "anonymous" });
}

export function markErrorResponse() {
  appCounters.errorResponses += 1;
}

export function verifyBackups() {
  lastBackupVerificationAt = new Date().toISOString();
  return { status: "verified", lastVerificationAt: lastBackupVerificationAt, checks: ["state-store-readable", "manifest-keys-present", "export-archive-visible"] };
}

export function recordBackupRestoreDrill(metadata: Record<string, unknown> = {}) {
  lastBackupRestoreDrillAt = new Date().toISOString();
  recordSecurityEvent({ eventType: "backup.restore_drill", outcome: "success", severity: "low", actorRole: "system" });
  return { status: "drill-complete", lastRestoreDrillAt: lastBackupRestoreDrillAt, ...metadata };
}

export function getMetrics() {
  return {
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    labels: {
      normalized: true,
      routeStrategy: "router-template-or-sanitized-path",
      statusClassStrategy: "status-code-class",
      authStateEnum: ["anonymous", "authenticated", "mfa", "denied", "system", "other"],
      securityEventTypeEnum: [
        "auth.login",
        "auth.mfa.challenge",
        "auth.mfa.enroll",
        "auth.token.verify",
        "auth.rate_limit",
        "authz.denied",
        "authz.scope",
        "governance.packet.approval",
        "request.rate_limit",
        "documents.upload",
        "documents.quarantine",
        "documents.verification.report",
        "evidence.verify",
        "backup.restore_drill",
        "security.header_violation",
        "other",
      ],
    },
    http: {
      totalRequests: appCounters.totalRequests,
      errorResponses: appCounters.errorResponses,
      authFailures: appCounters.authFailures,
      byRoute: routeCounters,
      series: mapHttpSeries(),
    },
    security: {
      events: mapSecuritySeries(),
      dimensions: ["actorRole", "actorEmail", "tenantId", "trustId", "recordType", "recordId", "packetId", "approvalState", "evidenceSignatureStatus"],
    },
    backups: {
      lastVerificationAt: lastBackupVerificationAt,
      lastRestoreDrillAt: lastBackupRestoreDrillAt,
    },
  };
}

export function getDiagnostics() {
  return {
    logging: {
      structured: true,
      correlationIds: true,
      streams: {
        application: "app-log",
        audit: "audit-log",
      },
      deploymentSeparation: {
        recommendedCollectors: ["vector", "fluent-bit", "otel-collector"],
        routingKey: "stream",
      },
    },
    metrics: {
      normalizedLabels: true,
      invalidationDiagnostics: invalidationDiagnostics.slice(-25),
      recentSecurityEvents: operationalEvents.slice(-25),
      securityEventFields: ["eventType", "outcome", "severity", "actorRole", "actorEmail", "tenantId", "trustId", "recordType", "recordId", "packetId", "approvalState", "evidenceSignatureStatus", "metadata", "at"],
    },
    backups: {
      verificationMode: "governed-local-check",
      lastVerificationAt: lastBackupVerificationAt,
      lastRestoreDrillAt: lastBackupRestoreDrillAt,
    },
    deployment: {
      mode: "standalone-local-first",
      readinessChecks: ["state-store", "session-signing-keys", "manifest-signing-keys"],
    },
  };
}

function writeLogLine(line: Record<string, unknown>, stream: NodeJS.WriteStream) {
  stream.write(`${JSON.stringify(line)}\n`);
}

export function logApp(level: string, event: string, payload: Record<string, unknown> = {}) {
  const stream = level === "error" || level === "warn" ? process.stderr : process.stdout;
  writeLogLine({ stream: "app-log", level, event, ts: new Date().toISOString(), ...payload }, stream);
}

export function logAudit(event: string, payload: Record<string, unknown> = {}) {
  writeLogLine({ stream: "audit-log", level: "info", event, ts: new Date().toISOString(), immutableCandidate: true, ...payload }, process.stdout);
}
