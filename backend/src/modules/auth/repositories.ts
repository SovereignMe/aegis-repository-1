import { authService } from "./native-auth.js";

export class AuthRepository {
  verifyToken = authService.verifyToken.bind(authService);
  getBootstrapStatus = authService.getBootstrapStatus.bind(authService);
  bootstrapAdmin = authService.bootstrapAdmin.bind(authService);
  login = authService.login.bind(authService);
  register = authService.register.bind(authService);
  rotateRefreshSession = authService.rotateRefreshSession.bind(authService);
  revokeRefreshToken = authService.revokeRefreshToken.bind(authService);
  listSessionsForUser = authService.listSessionsForUser.bind(authService);
  revokeOtherSessions = authService.revokeOtherSessions.bind(authService);
  revokeSession = authService.revokeSession.bind(authService);
  changePassword = authService.changePassword.bind(authService);
  beginMfaSetup = authService.beginMfaSetup.bind(authService);
  enableMfa = authService.enableMfa.bind(authService);
  verifyMfaChallenge = authService.verifyMfaChallenge.bind(authService);
  listUsers = authService.listUsers.bind(authService);
  createManagedUser = authService.createManagedUser.bind(authService);
  assertSecureBootstrapConfiguration = authService.assertSecureBootstrapConfiguration.bind(authService);
}

export const authRepository = new AuthRepository();
