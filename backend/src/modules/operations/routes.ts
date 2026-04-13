import { requireAuthorized } from "../../services/authorization.service.js";
import { requestContext } from "../shared/http.js";
import { operationModuleServices } from "./interfaces.js";
import { operationValidators } from "./validators.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerOperationalRoutes(app: any) {
  const { integrations, tasks, contacts, timers } = operationModuleServices;

  app.get("/integrations", { preHandler: requireAuthorized("integrations.read") }, async (request: any) => integrations.listAvailable(requestContext(request)));
  app.patch("/integrations/:id/sync", { preHandler: requireAuthorized("integrations.sync"), schema: withErrorResponses({ params: operationValidators.integrationSyncParams }) }, async (request: any, reply: any) => {
    try {
      return await integrations.markSync(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(error.statusCode || 404).send({ message: error.message });
    }
  });

  app.get("/deadline-rules", { preHandler: requireAuthorized("tasks.read") }, async () => tasks.listRules());
  app.get("/tasks", { preHandler: requireAuthorized("tasks.read") }, async (request: any) => tasks.listTasks(requestContext(request)));
  app.post("/tasks/from-document", { preHandler: requireAuthorized("tasks.create"), schema: withErrorResponses({ body: operationValidators.taskFromDocumentBody }) }, async (request: any) => tasks.createTaskFromDocument(requestContext(request), request.body));
  app.post("/tasks", { preHandler: requireAuthorized("tasks.create"), schema: withErrorResponses({ body: operationValidators.taskBody }) }, async (request: any) => tasks.createTask(requestContext(request), request.body));
  app.patch("/tasks/:id/complete", { preHandler: requireAuthorized("tasks.complete"), schema: withErrorResponses({ params: operationValidators.idParam }) }, async (request: any, reply: any) => {
    try {
      return await tasks.completeTask(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(404).send({ message: error.message });
    }
  });

  app.get("/contacts", { preHandler: requireAuthorized("contacts.read") }, async (request: any) => contacts.listContacts(requestContext(request)));
  app.post("/contacts", { preHandler: requireAuthorized("contacts.write"), schema: withErrorResponses({ body: operationValidators.contactBody }) }, async (request: any) => contacts.saveContact(requestContext(request), request.body));

  app.get("/timers", { preHandler: requireAuthorized("timers.read") }, async (request: any) => timers.listTimers(requestContext(request)));
  app.post("/timers", { preHandler: requireAuthorized("timers.start"), schema: withErrorResponses({ body: operationValidators.timerBody }) }, async (request: any) => timers.startTimer(requestContext(request), request.body));
  app.patch("/timers/:id/stop", { preHandler: requireAuthorized("timers.stop"), schema: withErrorResponses({ params: operationValidators.idParam }) }, async (request: any, reply: any) => {
    try {
      return await timers.stopTimer(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(404).send({ message: error.message });
    }
  });
}