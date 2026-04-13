import { sharedSchemas } from "../../services/validation.js";

export const authValidators = {
  bootstrapAdminBody: sharedSchemas.bootstrapAdminBody,
  loginBody: sharedSchemas.loginBody,
  registerBody: sharedSchemas.registerBody,
  changePasswordBody: sharedSchemas.changePasswordBody,
  mfaEnableBody: sharedSchemas.mfaEnableBody,
  mfaVerifyChallengeBody: sharedSchemas.mfaVerifyChallengeBody,
  idParam: sharedSchemas.idParam,
};
