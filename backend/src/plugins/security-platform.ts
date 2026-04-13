import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { authService } from "../services/auth.service.js";
import { rateLimitService } from "../services/rateLimit.service.js";
import {
  bumpMetric,
  createCorrelationId,
  logApp,
  markAuthFailure,
  markErrorResponse,
  recordHttpRequestMetric,
  recordSecurityEvent,
} from "../services/observability.service.js";
import { isPrivateNetworkIp, resolveClientIp } from "../services/network.js";
import { canPerform } from "../services/authorization.service.js";

function applySecurityHeaders(reply: any) {
  reply.header("X-Frame-Options", "DENY");
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("Referrer-Policy", "no-referrer");
  reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=(), payment=(), display-capture=()");
  reply.header("Cross-Origin-Opener-Policy", "same-origin");
  reply.header("Cross-Origin-Resource-Policy", "same-origin");
  reply.header("Cross-Origin-Embedder-Policy", "require-corp");
  reply.header("X-Permitted-Cross-Domain-Policies", "none");
  reply.header("Cache-Control", "no-store");
  if (env.isProduction) reply.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  const cspHeaderName = env.cspReportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
  reply.header(cspHeaderName, env.contentSecurityPolicy);
}

function routeLabelFor(request: any) {
  return request.routeOptions?.url || request.routerPath || request.url;
}

function authStateFor(request: any) {
  return request.authState || (request.currentUser ? "authenticated" : "anonymous");
}

export async function registerSecurityPlatform(app: FastifyInstance) {
  await app.register(cookie, {
    hook: "onRequest",
    parseOptions: {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: env.isProduction,
    },
  });

  app.addHook("onRequest", async (request: any, reply) => {
    request.correlationId = request.headers["x-correlation-id"] || createCorrelationId();
    request.clientIp = resolveClientIp(request, env.trustProxy, env.trustedProxyCidrs);
    reply.header("X-Correlation-Id", request.correlationId);
    applySecurityHeaders(reply);

    const routeLabel = routeLabelFor(request);
    bumpMetric("requests", routeLabel);
    const rate = rateLimitService.consumeRequest(`${request.clientIp}:${routeLabel}`);
    if (!rate.allowed) {
      request.authState = authStateFor(request);
      recordSecurityEvent({ eventType: "request.rate_limit", outcome: "blocked", severity: "medium", actorRole: request.currentUser?.role || "anonymous" });
      recordHttpRequestMetric({ method: request.method, route: routeLabel, statusCode: 429, authState: request.authState });
      return reply.code(429).send({ message: "Rate limit exceeded.", retryAfterMs: rate.retryAfterMs });
    }

    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    request.currentUser = await authService.verifyToken(token);
    request.authState = request.currentUser ? (request.currentUser.mfaEnabled ? "mfa" : "authenticated") : "anonymous";
    logApp("info", "request.received", {
      correlationId: request.correlationId,
      method: request.method,
      url: request.url,
      userId: request.currentUser?.id || null,
      clientIp: request.clientIp,
      proxyTrusted: env.trustProxy,
    });
  });

  app.addHook("onResponse", async (request: any, reply) => {
    recordHttpRequestMetric({
      method: request.method,
      route: routeLabelFor(request),
      statusCode: reply.statusCode,
      authState: authStateFor(request),
    });
  });

  app.setErrorHandler((error: any, request: any, reply) => {
    if (error.validation) {
      recordSecurityEvent({
        eventType: "other",
        outcome: "denied",
        severity: "low",
        actorRole: request.currentUser?.role || "anonymous",
        metadata: { validation: true, route: routeLabelFor(request) },
      });
      return reply.code(400).send({
        message: "Request validation failed.",
        details: error.validation,
        correlationId: request.correlationId || null,
      });
    }

    const isAuthFailure = error?.statusCode === 401 || error?.statusCode === 403 || error?.message === "Authentication required.";
    if (isAuthFailure) {
      markAuthFailure();
      recordSecurityEvent({
        eventType: "authz.denied",
        outcome: error?.statusCode === 403 ? "denied" : "failure",
        severity: "medium",
        actorRole: request.currentUser?.role || "anonymous",
      });
      logApp("warn", "auth.failure", {
        correlationId: request.correlationId,
        path: request.url,
        clientIp: request.clientIp || null,
        message: error.message,
      });
      return reply.code(error.statusCode || 401).send({ message: error.message || "Authentication required." });
    }

    markErrorResponse();
    logApp("error", "request.failure", {
      correlationId: request.correlationId,
      path: request.url,
      clientIp: request.clientIp || null,
      message: error.message,
    });
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({ message: error.message || "Internal server error." });
  });
}

export function requireAdminAccess() {
  return async function preHandler(request: any, reply: any) {
    if (!request.currentUser) return reply.code(401).send({ message: "Authentication required." });
    if (canPerform("controls.role", request.currentUser.role)) return;
    return reply.code(403).send({ message: "Administrator access is required." });
  };
}

export function requireMetricsAccess() {
  return async function preHandler(request: any, reply: any) {
    if (request.currentUser && canPerform("controls.role", request.currentUser.role)) return;
    if (env.metricsAccessMode === "private-or-admin" && isPrivateNetworkIp(request.clientIp)) return;
    if (!request.currentUser) return reply.code(401).send({ message: "Authentication required." });
    return reply.code(403).send({ message: "Administrator access is required." });
  };
}
