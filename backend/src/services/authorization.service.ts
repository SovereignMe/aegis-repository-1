import type { RequestContext, UserRole } from "../models/domain.js";
import { db } from "../store/governance-store.js";
import {
  DEFAULT_PERMISSION_MATRIX,
  hasAnyPermission,
  hasPermission,
  normalizePermissionsMatrix,
  type PermissionAction,
} from "../../../shared/src/permissions.js";

export type { PermissionAction };

export const DefaultPermissionMatrix = DEFAULT_PERMISSION_MATRIX;

function currentPermissionState() {
  return db.permissions as Record<string, Record<string, boolean>> | undefined;
}

export function canPerform(action: PermissionAction, role: UserRole) {
  return hasPermission(currentPermissionState(), role, action);
}

export function canPerformAny(actions: PermissionAction[], role: UserRole) {
  return hasAnyPermission(currentPermissionState(), role, actions);
}

export function getActor(context: RequestContext): string {
  return `USER:${context.user.email}@${context.user.activeTrustId}`;
}

export function assertAuthorized(
  context: RequestContext,
  action: PermissionAction,
  label = "Action",
) {
  if (canPerform(action, context.user.role)) return;

  const error = new Error(
    `${label} requires permission ${action} for role ${context.user.role}.`,
  ) as Error & { statusCode?: number; permissionAction?: string; role?: string };

  error.statusCode = 403;
  error.permissionAction = action;
  error.role = context.user.role;
  throw error;
}

export function requireAuthorized(action: PermissionAction) {
  return async function preHandler(
    request: { currentUser?: RequestContext["user"] },
    reply: { code: (status: number) => { send: (payload: unknown) => unknown } },
  ) {
    if (!request.currentUser) {
      return reply.code(401).send({ message: "Authentication required." });
    }

    if (canPerform(action, request.currentUser.role)) return;

    return reply.code(403).send({
      message: `Permission denied for action ${action}.`,
      action,
      role: request.currentUser.role,
    });
  };
}

export function requireAuthenticated() {
  return async function preHandler(
    request: { currentUser?: RequestContext["user"] },
    reply: { code: (status: number) => { send: (payload: unknown) => unknown } },
  ) {
    if (request.currentUser) return;
    return reply.code(401).send({ message: "Authentication required." });
  };
}

export function requireAnyAuthorized(actions: PermissionAction[]) {
  return async function preHandler(
    request: { currentUser?: RequestContext["user"] },
    reply: { code: (status: number) => { send: (payload: unknown) => unknown } },
  ) {
    if (!request.currentUser) {
      return reply.code(401).send({ message: "Authentication required." });
    }

    if (canPerformAny(actions, request.currentUser.role)) return;

    return reply.code(403).send({
      message: `Permission denied. One of these permissions is required: ${actions.join(", ")}.`,
      actions,
      role: request.currentUser.role,
    });
  };
}

export { normalizePermissionsMatrix };
