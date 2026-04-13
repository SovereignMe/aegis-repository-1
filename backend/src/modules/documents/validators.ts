import { sharedSchemas } from "../../services/validation.js";

export const documentValidators = {
  documentBody: sharedSchemas.documentBody,
  idParam: sharedSchemas.idParam,
  qQuery: sharedSchemas.qQuery,
};
