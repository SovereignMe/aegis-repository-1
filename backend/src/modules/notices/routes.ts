import { requireAuthorized } from "../../services/authorization.service.js";
import { requestContext } from "../shared/http.js";
import { noticeModuleServices } from "./interfaces.js";
import { noticeValidators } from "./validators.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerNoticeRoutes(app: any) {
  const { notices } = noticeModuleServices;
  app.post("/governance/notices", { preHandler: requireAuthorized("notices.write"), schema: withErrorResponses({ body: noticeValidators.noticeBody }) }, async (request: any, reply: any) => {
    try {
      return await notices.createNotice(requestContext(request), request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
  app.patch("/governance/notices/:id/serve", { preHandler: requireAuthorized("notices.serve"), schema: withErrorResponses({ params: noticeValidators.idParam, body: noticeValidators.serveNoticeBody }) }, async (request: any, reply: any) => {
    try {
      return await notices.serveNotice(requestContext(request), request.params.id, request.body?.trackingNumber || null);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });
}