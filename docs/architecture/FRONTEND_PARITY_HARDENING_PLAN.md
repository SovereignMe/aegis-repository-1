# AEGIS Frontend Parity Hardening Plan

## Objective
Bring frontend engineering maturity to parity with backend by enforcing type safety, shared contracts, permission correctness, accessibility, and regression safety.

---

## Workstreams

### WS1: TypeScript-First Enforcement
**Targets**
- frontend/tsconfig.json (strict: true, noImplicitAny: true)
- remove // @ts-nocheck across frontend
- convert .js → .ts/.tsx

**Acceptance Criteria**
- `npm run typecheck` passes with zero `any` in core modules
- no @ts-nocheck in governance codepaths

**Release Gate**
- CI fails on type errors

---

### WS2: Shared API Contracts
**Targets**
- shared/src/contracts/*.ts
- frontend/api-client.ts
- backend route schemas

**Acceptance Criteria**
- all API calls typed from shared contracts
- no duplicated DTO definitions

**Release Gate**
- CI check: no frontend-only DTO duplicates

---

### WS3: Component Decomposition
**Targets**
- frontend/src/app/components/governance/*

**Acceptance Criteria**
- max component size < 300 lines
- logic separated from presentation

**Release Gate**
- lint rule for max-lines-per-component

---

### WS4: Accessibility Hardening
**Targets**
- all interactive components

**Acceptance Criteria**
- keyboard navigable
- ARIA roles present

**Release Gate**
- axe accessibility tests pass

---

### WS5: Permission & UI Regression Tests
**Targets**
- frontend/tests/permissions.spec.ts

**Acceptance Criteria**
- role-based UI visibility tested
- no unauthorized actions visible

**Release Gate**
- CI fails on regression

---

## CI Release Gates Added
- typecheck
- accessibility test
- permission regression test

