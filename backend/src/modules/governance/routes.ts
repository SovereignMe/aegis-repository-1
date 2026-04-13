import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { requireAnyAuthorized, requireAuthorized } from "../../services/authorization.service.js";
import { requestContext } from "../shared/http.js";
import { governanceModuleServices } from "./interfaces.js";
import { governanceValidators } from "./validators.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerGovernanceRoutes(app: any) {
  const { governance } = governanceModuleServices;
  app.get("/governance/overview", { preHandler: requireAnyAuthorized(["beneficiaries.read", "distributions.read", "notices.read", "accounting.read"]) }, async (request: any) => governance.getOverview(requestContext(request)));
  app.get("/governance/artifacts", { preHandler: requireAnyAuthorized(["beneficiaries.read", "distributions.read", "notices.read", "accounting.read"]) }, async (request: any) => governance.listArtifacts(requestContext(request)));
  app.get("/governance/administrative-records", { preHandler: requireAnyAuthorized(["documents.read", "settings.read"]) }, async (request: any) => governance.getAdministrativeRecordsPage(requestContext(request)));
  app.get("/governance/notices", { preHandler: requireAuthorized("notices.read") }, async (request: any) => governance.getNoticesPage(requestContext(request)));
  app.get("/governance/beneficiaries", { preHandler: requireAuthorized("beneficiaries.read") }, async (request: any) => governance.getBeneficiariesPage(requestContext(request)));
  app.get("/governance/ledgers", { preHandler: requireAuthorized("accounting.read") }, async (request: any) => governance.getLedgersPage(requestContext(request)));
  app.get("/governance/packets", { preHandler: requireAuthorized("governance.packet") }, async (request: any) => governance.getPacketsPage(requestContext(request)));
  app.get("/governance/approvals", { preHandler: requireAnyAuthorized(["distributions.approve", "governance.packet"]) }, async (request: any) => governance.getApprovalsPage(requestContext(request)));
  app.get("/governance/policies/page", { preHandler: requireAuthorized("settings.read") }, async (request: any) => governance.getPoliciesPage(requestContext(request)));
  app.get("/governance/verification", { preHandler: requireAuthorized("audit.verify") }, async (request: any) => governance.getVerificationPage(requestContext(request)));
  app.get("/governance/pages/:page", { preHandler: requireAnyAuthorized(["beneficiaries.read", "distributions.read", "notices.read", "accounting.read", "audit.verify", "settings.read", "governance.packet", "documents.read"]) }, async (request: any) => governance.getWorkspacePage(requestContext(request), request.params.page));

  app.get("/governance/policies", { preHandler: requireAuthorized("settings.read") }, async (request: any) => governance.listPolicyVersions(requestContext(request)));
  app.post("/governance/policies", { preHandler: requireAuthorized("settings.write"), schema: withErrorResponses({ body: governanceValidators.policyVersionBody }) }, async (request: any, reply: any) => {
    try {
      return await governance.createPolicyVersion(requestContext(request), request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
  app.patch("/governance/policies/:policyType/versions/:versionId/activate", { preHandler: requireAuthorized("settings.write"), schema: withErrorResponses({ params: governanceValidators.policyVersionParams }) }, async (request: any, reply: any) => {
    try {
      return await governance.activatePolicyVersion(requestContext(request), request.params.policyType, request.params.versionId);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
  app.post("/governance/beneficiaries", { preHandler: requireAuthorized("beneficiaries.write"), schema: withErrorResponses({ body: governanceValidators.beneficiaryBody }) }, async (request: any, reply: any) => {
    try {
      return await governance.createBeneficiary(requestContext(request), request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
  app.post("/governance/packets", { preHandler: requireAuthorized("governance.packet"), schema: withErrorResponses({ body: governanceValidators.packetBody }) }, async (request: any, reply: any) => {
    try {
      return await governance.buildPacket(requestContext(request), request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
  app.patch("/governance/packets/:id/approve", { preHandler: requireAuthorized("governance.packet"), schema: withErrorResponses({ params: governanceValidators.idParam, body: governanceValidators.approvalDecisionBody }) }, async (request: any, reply: any) => {
    try {
      return await governance.approvePacket(requestContext(request), request.params.id, request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
  app.get("/governance/packets/:id/manifest", { preHandler: requireAuthorized("governance.packet"), schema: withErrorResponses({ params: governanceValidators.idParam }) }, async (request: any, reply: any) => {
    try {
      return await governance.getPacketManifestSummary(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(error.statusCode || 404).send({ message: error.message });
    }
  });
  app.get("/governance/packets/:id/artifact-status", { preHandler: requireAuthorized("governance.packet"), schema: withErrorResponses({ params: governanceValidators.idParam }) }, async (request: any, reply: any) => {
    try {
      return await governance.getPacketArtifactStatus(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(error.statusCode || 404).send({ message: error.message });
    }
  });
  app.get("/governance/packets/:id/download", { preHandler: requireAuthorized("governance.packet"), schema: withErrorResponses({ params: governanceValidators.idParam }) }, async (request: any, reply: any) => {
    try {
      const packet = governance.getPacketBundle(requestContext(request), request.params.id);
      const stat = await fs.stat(packet.bundlePath as string).catch(() => null);
      if (!stat) return reply.code(404).send({ message: "Packet bundle is unavailable." });
      reply.header("Content-Type", "application/zip");
      reply.header("Content-Length", String(stat.size));
      reply.header("Content-Disposition", `attachment; filename="${path.basename(packet.bundlePath as string)}"`);
      return reply.send(createReadStream(packet.bundlePath as string));
    } catch (error: any) {
      return reply.code(error.statusCode || 404).send({ message: error.message });
    }
  });
}