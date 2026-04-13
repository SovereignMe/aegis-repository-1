import { requireAuthorized } from "../../services/authorization.service.js";
import { requestContext } from "../shared/http.js";
import { settingsValidators } from "./validators.js";
import { settingsModuleServices } from "./interfaces.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerSettingsRoutes(app: any) {
  const { settings } = settingsModuleServices;
  app.get("/settings", { preHandler: requireAuthorized("settings.read") }, async (request: any) => settings.getEffectiveSettings(requestContext(request)));
  app.put("/settings", { preHandler: requireAuthorized("settings.write"), schema: withErrorResponses({ body: settingsValidators.settingsBody }) }, async (request: any) => settings.updateSettings(requestContext(request), request.body));
}