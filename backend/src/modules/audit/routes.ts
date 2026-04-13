import { requireAuthenticated, requireAuthorized } from "../../services/authorization.service.js";
import { requestContext } from "../shared/http.js";
import { auditModuleServices } from "./interfaces.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerAuditRoutes(app: any) {
  const { audit } = auditModuleServices;
  app.get("/meta/storage", { preHandler: requireAuthenticated(), schema: withErrorResponses() }, async () => audit.getStorageMeta());
  app.get("/audit/verify", { preHandler: requireAuthorized("audit.verify"), schema: withErrorResponses() }, async (request: any) => audit.verifyAudit(requestContext(request).user.activeTrustId));
  app.get("/audit", { preHandler: requireAuthorized("audit.full.read"), schema: withErrorResponses() }, async (request: any) => audit.getAuditForTrust(requestContext(request).user.activeTrustId));
}