import { sharedSchemas } from "../../services/validation.js";

export const operationValidators = {
  integrationSyncParams: sharedSchemas.integrationSyncParams,
  taskBody: sharedSchemas.taskBody,
  taskFromDocumentBody: sharedSchemas.taskFromDocumentBody,
  contactBody: sharedSchemas.contactBody,
  timerBody: sharedSchemas.timerBody,
  idParam: sharedSchemas.idParam,
};
