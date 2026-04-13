import type { AuthenticatedUser } from "../../models/domain.js";

export const errorResponseSchema = {
  type: "object",
  additionalProperties: true,
  properties: {
    message: { type: "string" },
    details: { type: ["array", "object", "null"] },
    retryAfterMs: { type: ["number", "null"] },
  },
};

export const healthResponseSchema = {
  type: "object",
  additionalProperties: true,
  required: ["status"],
  properties: {
    status: { type: "string" },
    service: { type: "string" },
    mode: { type: "string" },
  },
};

export function withErrorResponses(schema: Record<string, unknown> = {}) {
  const response = ((schema as any).response || {}) as Record<number, unknown>;
  return {
    ...schema,
    response: {
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      422: errorResponseSchema,
      429: errorResponseSchema,
      500: errorResponseSchema,
      ...response,
    },
  };
}

export interface TypedRouteRequest<TBody = unknown, TParams = Record<string, string>, TQuery = Record<string, unknown>> {
  body: TBody;
  params: TParams;
  query: TQuery;
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  ip: string;
  url: string;
  method: string;
  currentUser?: AuthenticatedUser;
  correlationId?: string;
}
