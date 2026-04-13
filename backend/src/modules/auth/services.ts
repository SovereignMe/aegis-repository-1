import type { AuthRepository } from "./repositories.js";

export class AuthModuleService {
  constructor(private readonly repository: AuthRepository) {}

  verifyToken(...args: Parameters<AuthRepository["verifyToken"]>) { return this.repository.verifyToken(...args); }
  getBootstrapStatus(...args: Parameters<AuthRepository["getBootstrapStatus"]>) { return this.repository.getBootstrapStatus(...args); }
  bootstrapAdmin(...args: Parameters<AuthRepository["bootstrapAdmin"]>) { return this.repository.bootstrapAdmin(...args); }
  login(...args: Parameters<AuthRepository["login"]>) { return this.repository.login(...args); }
  register(...args: Parameters<AuthRepository["register"]>) { return this.repository.register(...args); }
  rotateRefreshSession(...args: Parameters<AuthRepository["rotateRefreshSession"]>) { return this.repository.rotateRefreshSession(...args); }
  revokeRefreshToken(...args: Parameters<AuthRepository["revokeRefreshToken"]>) { return this.repository.revokeRefreshToken(...args); }
  listSessionsForUser(...args: Parameters<AuthRepository["listSessionsForUser"]>) { return this.repository.listSessionsForUser(...args); }
  revokeOtherSessions(...args: Parameters<AuthRepository["revokeOtherSessions"]>) { return this.repository.revokeOtherSessions(...args); }
  revokeSession(...args: Parameters<AuthRepository["revokeSession"]>) { return this.repository.revokeSession(...args); }
  changePassword(...args: Parameters<AuthRepository["changePassword"]>) { return this.repository.changePassword(...args); }
  beginMfaSetup(...args: Parameters<AuthRepository["beginMfaSetup"]>) { return this.repository.beginMfaSetup(...args); }
  enableMfa(...args: Parameters<AuthRepository["enableMfa"]>) { return this.repository.enableMfa(...args); }
  verifyMfaChallenge(...args: Parameters<AuthRepository["verifyMfaChallenge"]>) { return this.repository.verifyMfaChallenge(...args); }
}
