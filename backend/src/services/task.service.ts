import { operationModuleServices } from "../modules/operations/interfaces.js";

export { TaskModuleService as TaskService } from "../modules/operations/services.js";
export { operationModuleServices } from "../modules/operations/interfaces.js";

export const taskService = operationModuleServices.tasks;
