import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";

export function requestClientIp(request: any) {
  return request.clientIp || request.ip || request.socket?.remoteAddress || null;
}

export function sessionMetadataFromRequest(request: any) {
  return {
    ip: requestClientIp(request),
    userAgent: request.headers["user-agent"] || null,
  };
}

function constantTimeSecretEquals(provided: string, expected: string) {
  const left = createHash("sha256").update(String(provided || ""), "utf8").digest();
  const right = createHash("sha256").update(String(expected || ""), "utf8").digest();
  return timingSafeEqual(left, right);
}

export function requireBootstrapKey() {
  return async function preHandler(request: any, reply: any) {
    if (env.nodeEnv === "development") return;
    const provided = String(request.headers["x-bootstrap-api-key"] || "").trim();
    if (!provided) return reply.code(401).send({ message: "Bootstrap API key is required outside development." });
    if (!constantTimeSecretEquals(provided, env.bootstrapApiKey)) {
      return reply.code(403).send({ message: "Bootstrap API key is invalid." });
    }
  };
}
