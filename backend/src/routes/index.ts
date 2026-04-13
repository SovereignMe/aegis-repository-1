import { registerAuthRoutes } from "../modules/auth/routes.js";
import { registerIamRoutes } from "../modules/iam/routes.js";
import { registerDocumentRoutes } from "../modules/documents/routes.js";
import { registerRepositoryRoutes } from "../modules/repository/routes.js";
import { registerGovernanceRoutes } from "../modules/governance/routes.js";
import { registerNoticeRoutes } from "../modules/notices/routes.js";
import { registerDistributionRoutes } from "../modules/distributions/routes.js";
import { registerEvidenceRoutes } from "../modules/evidence/routes.js";
import { registerAuditRoutes } from "../modules/audit/routes.js";
import { registerSettingsRoutes } from "../modules/settings/routes.js";
import { registerOperationalRoutes } from "../modules/operations/routes.js";
import { withErrorResponses, healthResponseSchema } from "../modules/shared/route-contracts.js";

export async function registerRoutes(app: any) {
  app.get("/health", { schema: withErrorResponses({ response: { 200: healthResponseSchema } }) }, async () => ({ status: "ok", service: "trust-governance-app", mode: "standalone-local-first" }));

  await registerAuditRoutes(app);
  await registerAuthRoutes(app);
  await registerIamRoutes(app);
  await registerSettingsRoutes(app);
  await registerOperationalRoutes(app);
  await registerDocumentRoutes(app);
  await registerRepositoryRoutes(app);
  await registerGovernanceRoutes(app);
  await registerDistributionRoutes(app);
  await registerNoticeRoutes(app);
  await registerEvidenceRoutes(app);
}