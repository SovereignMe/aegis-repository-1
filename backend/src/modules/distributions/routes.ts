import { requireAuthorized } from "../../services/authorization.service.js";
import { requestContext } from "../shared/http.js";
import { distributionModuleServices } from "./interfaces.js";
import { distributionValidators } from "./validators.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerDistributionRoutes(app: any) {
  const { distributions } = distributionModuleServices;
  app.post("/governance/distributions", { preHandler: requireAuthorized("distributions.request"), schema: withErrorResponses({ body: distributionValidators.distributionBody }) }, async (request: any, reply: any) => {
    try {
      return await distributions.requestDistribution(requestContext(request), request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
  app.patch("/governance/distributions/:id/approve", { preHandler: requireAuthorized("distributions.approve"), schema: withErrorResponses({ params: distributionValidators.idParam, body: distributionValidators.approvalDecisionBody }) }, async (request: any, reply: any) => {
    try {
      return await distributions.approveDistribution(requestContext(request), request.params.id, request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
}