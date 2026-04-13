import { requireAuthenticated, requireAuthorized } from "../../services/authorization.service.js";
import { iamValidators } from "./validators.js";
import { iamModuleServices } from "./interfaces.js";
import { requestContext } from "../shared/http.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerIamRoutes(app: any) {
  const { iam } = iamModuleServices;

  app.get("/auth/users", { preHandler: requireAuthorized("controls.role") }, async (request: any) => iam.listUsers(requestContext(request)));
  app.post("/auth/users", { preHandler: requireAuthorized("controls.role"), schema: withErrorResponses({ body: iamValidators.userBody }) }, async (request: any, reply: any) => {
    try {
      return await iam.createUser(requestContext(request), request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message });
    }
  });

  app.get("/controls/role", { preHandler: requireAuthenticated() }, async (request: any) => iam.getRole(requestContext(request)));
  app.get("/controls/permissions", { preHandler: requireAuthorized("controls.permissions") }, async () => iam.getPermissions());
  app.put("/controls/permissions", { preHandler: requireAuthorized("controls.permissions"), schema: withErrorResponses({ body: iamValidators.permissionsBody }) }, async (request: any) => iam.setPermissions(requestContext(request), request.body.permissions));
}