import type { RequestContext } from "../../models/domain.js";
import { assertAuthorized, normalizePermissionsMatrix } from "../../services/authorization.service.js";
import type { IamRepository } from "./repositories.js";

export class IamModuleService {
  constructor(private readonly repository: IamRepository) {}

  getRole(context: RequestContext) {
    return { role: context.user.role, tenantId: context.user.tenantId, activeTrustId: context.user.activeTrustId, trustIds: context.user.trustIds };
  }

  getPermissions() {
    return { permissions: this.repository.getPermissionsMatrix() };
  }

  listUsers(context: RequestContext) {
    return { users: this.repository.listUsers().filter((user: any) => user.tenantId === context.user.tenantId) };
  }

  async setPermissions(context: RequestContext, permissions: Record<string, unknown>) {
    assertAuthorized(context, "controls.permissions", "Updating permission matrix");
    const before = structuredClone(this.repository.getPermissionsMatrix());
    const normalized = normalizePermissionsMatrix(permissions as Record<string, Record<string, boolean>>);
    this.repository.setPermissionsMatrix(normalized);
    this.repository.addAudit("PERMISSIONS_UPDATED", "control", "role-permissions", before, normalized as Record<string, unknown>, undefined, `USER:${context.user.email}`);
    await this.repository.persist("permissions-updated");
    return { permissions: normalized };
  }

  async createUser(context: RequestContext, input: { email: string; fullName: string; role: "VIEWER" | "EDITOR" | "ADMIN"; password: string }) {
    assertAuthorized(context, "controls.role", "Creating managed users");
    return this.repository.createManagedUser({ ...input, tenantId: context.user.tenantId, trustIds: context.user.trustIds, activeTrustId: context.user.activeTrustId });
  }
}
