import type { RequestContext } from "../../models/domain.js";
import { env } from "../../config/env.js";

export function requestContext(request: { currentUser?: RequestContext["user"] }): RequestContext {
  if (!request.currentUser) {
    const error = new Error("Authentication required.") as Error & { statusCode?: number };
    error.statusCode = 401;
    throw error;
  }
  return { user: request.currentUser };
}

export function getRefreshTokenFromCookies(request: any) {
  return request.cookies?.[env.refreshCookieName] || null;
}

export function setRefreshCookie(reply: any, refreshToken: string) {
  const cookie = [
    `${env.refreshCookieName}=${encodeURIComponent(refreshToken)}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${env.refreshTokenTtlSeconds}`,
  ];
  if (env.isProduction) cookie.push("Secure");
  reply.header("Set-Cookie", cookie.join("; "));
}

export function clearRefreshCookie(reply: any) {
  const cookie = [
    `${env.refreshCookieName}=`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=0",
  ];
  if (env.isProduction) cookie.push("Secure");
  reply.header("Set-Cookie", cookie.join("; "));
}
