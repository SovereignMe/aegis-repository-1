import { AuthModuleService } from "./services.js";
import { authRepository } from "./repositories.js";

const authModuleService = new AuthModuleService(authRepository);

export interface AuthServicePort {
  verifyToken: AuthModuleService["verifyToken"];
  getBootstrapStatus: AuthModuleService["getBootstrapStatus"];
  bootstrapAdmin: AuthModuleService["bootstrapAdmin"];
  login: AuthModuleService["login"];
  register: AuthModuleService["register"];
  rotateRefreshSession: AuthModuleService["rotateRefreshSession"];
  revokeRefreshToken: AuthModuleService["revokeRefreshToken"];
  listSessionsForUser: AuthModuleService["listSessionsForUser"];
  revokeOtherSessions: AuthModuleService["revokeOtherSessions"];
  revokeSession: AuthModuleService["revokeSession"];
  changePassword: AuthModuleService["changePassword"];
  beginMfaSetup: AuthModuleService["beginMfaSetup"];
  enableMfa: AuthModuleService["enableMfa"];
  verifyMfaChallenge: AuthModuleService["verifyMfaChallenge"];
}

export const authModuleServices: { auth: AuthServicePort } = {
  auth: authModuleService,
};
