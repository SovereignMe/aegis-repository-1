# Security Middleware Hardening

This pass reduces bespoke security plumbing and moves request security concerns behind shared framework-backed middleware.

## Changes

- Replaced manual cookie parsing with `@fastify/cookie`.
- Centralized request hardening in `backend/src/plugins/security-platform.ts`.
- Centralized auth/session request helpers in `backend/src/modules/shared/auth-middleware.ts`.
- Enabled stricter Fastify AJV validation defaults at app bootstrap.
- Standardized auth route schema attachment so auth/session endpoints participate in the same validation and error-shaping flow as the rest of the platform.

## Security Effects

- Cookie parsing now uses vetted Fastify middleware rather than handwritten parsing logic.
- Security headers, request correlation, rate limiting, bearer-token verification, and security event/error accounting now execute from one middleware surface.
- Admin/metrics access checks are exposed as shared pre-handler abstractions rather than ad hoc route-local functions.
- Session metadata extraction is canonicalized for bootstrap, login, refresh, password change, and MFA challenge flows.

## Remaining Direction

- Expand explicit response schemas for success payloads on high-risk endpoints.
- Move route declarations to typed route factories for full request/reply typing.
- Consider `@fastify/helmet` if CSP/header policy can be aligned with the current custom header set.
