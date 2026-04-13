import { rateLimitService } from "../../services/rateLimit.service.js";
import { requireAuthenticated } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { authValidators } from "./validators.js";
import { authModuleServices } from "./interfaces.js";
import { clearRefreshCookie, getRefreshTokenFromCookies, requestContext, setRefreshCookie } from "../shared/http.js";
import { withErrorResponses } from "../shared/route-contracts.js";
import { requestClientIp, requireBootstrapKey, sessionMetadataFromRequest } from "../shared/auth-middleware.js";

export async function registerAuthRoutes(app: any) {
  const { auth } = authModuleServices;

  app.get("/auth/bootstrap-status", { schema: withErrorResponses() }, async () => auth.getBootstrapStatus());

  app.post("/auth/bootstrap-admin", { preHandler: requireBootstrapKey(), schema: withErrorResponses({ body: authValidators.bootstrapAdminBody }) }, async (request: any, reply: any) => {
    try {
      const response = await auth.bootstrapAdmin(request.body, sessionMetadataFromRequest(request));
      setRefreshCookie(reply, response.refreshToken);
      return { token: response.token, user: response.user, mustChangePassword: response.mustChangePassword, bootstrapComplete: true };
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });

  app.post("/auth/login", { schema: withErrorResponses({ body: authValidators.loginBody }) }, async (request: any, reply: any) => {
    const throttleKey = `${requestClientIp(request) || "unknown"}:${String(request.body.email || "").trim().toLowerCase()}`;
    const throttleState = rateLimitService.checkLogin(throttleKey);
    if (!throttleState.allowed) {
      return reply.code(429).send({ code: "LOGIN_RATE_LIMITED", message: "Access is temporarily restricted due to repeated sign-in attempts. Try again after the cooling period.", accessState: "rate_limited", retryAfterMs: throttleState.retryAfterMs, retryAfterSeconds: Math.max(1, Math.ceil((throttleState.retryAfterMs || 0) / 1000)) });
    }
    try {
      const response = await auth.login(String(request.body.email || ""), String(request.body.password || ""), { ...sessionMetadataFromRequest(request), mfaCode: request.body.mfaCode || null });
      rateLimitService.clearLoginFailures(throttleKey);
      if (response?.requiresMfa) {
        clearRefreshCookie(reply);
        return response;
      }
      if (response.refreshToken) setRefreshCookie(reply, response.refreshToken);
      return { token: response.token, user: response.user, mustChangePassword: response.mustChangePassword };
    } catch (error: any) {
      rateLimitService.recordLoginFailure(throttleKey);
      return reply.code(error.statusCode || 401).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });

  app.post("/auth/register", { schema: withErrorResponses({ body: authValidators.registerBody }) }, async (request: any, reply: any) => {
    if ((db.settings as any)?.security?.allowSelfRegistration !== true) {
      return reply.code(403).send({ code: "SELF_REGISTRATION_DISABLED", message: "Self-registration is disabled. Administrator provisioning is required." });
    }
    try {
      return await auth.register(request.body);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });

  app.post("/auth/refresh", { schema: withErrorResponses() }, async (request: any, reply: any) => {
    const rotated = await auth.rotateRefreshSession(getRefreshTokenFromCookies(request), sessionMetadataFromRequest(request));
    if (!rotated) {
      clearRefreshCookie(reply);
      return reply.code(401).send({ code: "REFRESH_INVALID", message: "The session is invalid or expired. Sign in again to continue.", accessState: "session_expired" });
    }
    await db.persist("auth-refresh");
    setRefreshCookie(reply, rotated.refreshToken);
    return { token: rotated.accessToken, user: await auth.verifyToken(rotated.accessToken), session: rotated.session };
  });

  app.post("/auth/logout", { schema: withErrorResponses() }, async (request: any, reply: any) => {
    auth.revokeRefreshToken(getRefreshTokenFromCookies(request), { sessionId: request.currentUser?.sessionId || null });
    await db.persist("auth-logout");
    clearRefreshCookie(reply);
    return reply.code(204).send();
  });

  app.get("/auth/sessions", { preHandler: requireAuthenticated(), schema: withErrorResponses() }, async (request: any) => ({ sessions: auth.listSessionsForUser(requestContext(request).user) }));
  app.post("/auth/sessions/revoke-others", { preHandler: requireAuthenticated(), schema: withErrorResponses() }, async (request: any) => auth.revokeOtherSessions(requestContext(request).user));
  app.delete("/auth/sessions/:id", { preHandler: requireAuthenticated(), schema: withErrorResponses({ params: authValidators.idParam }) }, async (request: any, reply: any) => {
    try {
      const result = await auth.revokeSession(requestContext(request).user, request.params.id);
      if (result.currentSessionRevoked) clearRefreshCookie(reply);
      return result;
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });

  app.post("/auth/change-password", { preHandler: requireAuthenticated(), schema: withErrorResponses({ body: authValidators.changePasswordBody }) }, async (request: any, reply: any) => {
    try {
      const response = await auth.changePassword(requestContext(request).user, request.body, sessionMetadataFromRequest(request));
      setRefreshCookie(reply, response.refreshToken);
      return response;
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });

  app.get("/auth/me", { preHandler: requireAuthenticated(), schema: withErrorResponses() }, async (request: any) => ({ user: requestContext(request).user }));
  app.post("/auth/mfa/setup", { preHandler: requireAuthenticated(), schema: withErrorResponses() }, async (request: any, reply: any) => {
    try {
      return await auth.beginMfaSetup(requestContext(request).user);
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });
  app.post("/auth/mfa/enable", { preHandler: requireAuthenticated(), schema: withErrorResponses({ body: authValidators.mfaEnableBody }) }, async (request: any, reply: any) => {
    try {
      return await auth.enableMfa(requestContext(request).user, String(request.body.code || ""));
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });
  app.post("/auth/mfa/verify-challenge", { schema: withErrorResponses({ body: authValidators.mfaVerifyChallengeBody }) }, async (request: any, reply: any) => {
    try {
      const response = await auth.verifyMfaChallenge(String(request.body.challengeToken || ""), String(request.body.code || ""), sessionMetadataFromRequest(request));
      if (response.refreshToken) setRefreshCookie(reply, response.refreshToken);
      return { token: response.token, user: response.user, mustChangePassword: response.mustChangePassword };
    } catch (error: any) {
      clearRefreshCookie(reply);
      return reply.code(error.statusCode || 401).send({ code: error.code || "AUTH_ERROR", message: error.message, accessState: error.accessState || null, lockedUntil: error.lockedUntil || null, retryAt: error.retryAt || null, retryAfterSeconds: error.retryAfterSeconds || null });
    }
  });
}
