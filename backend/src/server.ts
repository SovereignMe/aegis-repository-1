import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { env } from "./config/env.js";
import { authService } from "./services/auth.service.js";
import { db } from "./store/governance-store.js";
import { registerRoutes } from "./routes/index.js";
import {
  getDiagnostics,
  getMetrics,
  verifyBackups,
} from "./services/observability.service.js";
import { runBackupRestoreDrill } from "./services/backup-drill.service.js";
import {
  assertProductionRuntimeReady,
  getProductionReadinessReport,
} from "./services/production-readiness.service.js";
import {
  registerSecurityPlatform,
  requireAdminAccess,
  requireMetricsAccess,
} from "./plugins/security-platform.js";

console.log("ENV DEBUG", {
  SESSION_SECRET: process.env.SESSION_SECRET ? "SET" : "MISSING",
  JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ? "SET" : "MISSING",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ? "SET" : "MISSING",
  BOOTSTRAP_API_KEY: process.env.BOOTSTRAP_API_KEY ? "SET" : "MISSING",
  DATABASE_URL: process.env.DATABASE_URL ? "SET" : "MISSING",
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
});

export async function buildApp() {
  await db.init();

  const productionReadiness = assertProductionRuntimeReady();
  authService.assertSecureBootstrapConfiguration();

  const app = Fastify({
    logger: false,
    bodyLimit: env.uploadMaxBytes + 1024 * 1024,
    ajv: {
      customOptions: {
        removeAdditional: false,
        useDefaults: false,
        coerceTypes: false,
        allErrors: true,
      },
    },
  });

  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      callback(null, env.allowedOrigins.includes(origin));
    },
  });

  await app.register(multipart, {
    attachFieldsToBody: false,
    limits: { fileSize: env.uploadMaxBytes, files: 1 },
  });

  await registerSecurityPlatform(app);

  app.get("/ready", async () => ({
    status: productionReadiness.summary.ready ? "ready" : "attention",
    dependencies: {
      stateStore:
        productionReadiness.storage.mode === "postgres" ? "ok" : "attention",
      sessionSigningKeys: "ok",
      manifestSigningKeys: "ok",
    },
    proxy: {
      trustProxy: env.trustProxy,
      trustedCidrs: env.trustedProxyCidrs,
    },
    productionReadiness: {
      failed: productionReadiness.summary.failed,
      warnings: productionReadiness.summary.warnings,
    },
  }));

  app.get("/metrics", { preHandler: requireMetricsAccess() }, async () =>
    getMetrics()
  );

  app.get(
    "/admin/diagnostics",
    { preHandler: requireAdminAccess() },
    async () => ({
      status: "ok",
      ...getDiagnostics(),
      proxy: {
        trustProxy: env.trustProxy,
        trustedCidrs: env.trustedProxyCidrs,
      },
      alerts: {
        securityEventDashboard: "ops/observability/security-event-dashboard.json",
        alertThresholds: "ops/observability/security-alert-rules.yml",
      },
      productionReadiness: getProductionReadinessReport(),
    })
  );

  app.post(
    "/admin/diagnostics/backups/verify",
    { preHandler: requireAdminAccess() },
    async () => verifyBackups()
  );

  app.post(
    "/admin/diagnostics/backups/restore-drill",
    { preHandler: requireAdminAccess() },
    async () => runBackupRestoreDrill()
  );

  await registerRoutes(app);

  return app;
}

export async function bootstrap() {
  const app = await buildApp();
  await app.listen({ port: env.port, host: "0.0.0.0" });
  console.log(`AEGIS backend listening on http://localhost:${env.port}`);
  return app;
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
