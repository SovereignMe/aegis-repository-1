import { sharedSchemas } from "../../services/validation.js";

export const iamValidators = {
  userBody: sharedSchemas.userBody,
  permissionsBody: sharedSchemas.permissionsBody,
};
