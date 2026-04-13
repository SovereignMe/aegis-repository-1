import crypto from "node:crypto";
import type { GovernancePolicyVersionRecord, RequestContext } from "../../models/domain.js";
import { assertAuthorized, getActor } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { resolveTrustId, scopeCollectionByTrust } from "../../services/tenancy.service.js";
import { createDetachedSignature } from "./signing-model.js";

function nowIso() { return new Date().toISOString(); }
function slug(value: string) { return String(value || "policy").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "policy"; }
function sha(value: unknown) { return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

export class PolicyVersionService {
  listPolicyVersions(context: RequestContext) {
    const { trustId } = resolveTrustId(context);
    const policyGovernance = (db.settings as Record<string, any>)?.policyGovernance || {};
    return {
      activeVersionIds: policyGovernance.activeVersionIds || {},
      jurisdictionHintPackDefaults: policyGovernance.jurisdictionHintPackDefaults || {},
      versions: [...scopeCollectionByTrust((db.policyVersions || []), trustId)].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    };
  }

  async createPolicyVersion(context: RequestContext, input: { policyType: GovernancePolicyVersionRecord["policyType"]; title: string; policyKey?: string; content: Record<string, unknown>; changeSummary?: string; activate?: boolean; }) {
    assertAuthorized(context, "settings.write", "Creating policy version");
    const { trustId } = resolveTrustId(context);
    const createdAt = nowIso();
    const actor = getActor(context);
    const versions = scopeCollectionByTrust((db.policyVersions || []), trustId).filter((item) => item.policyType === input.policyType);
    const previous = versions.sort((a, b) => b.version - a.version)[0] || null;
    const version = previous ? previous.version + 1 : 1;
    const policyKey = slug(input.policyKey || input.policyType);
    const historyHashBase = { previousHistoryHash: previous?.historyHash || null, trustId, policyType: input.policyType, policyKey, version, content: input.content, changeSummary: input.changeSummary || null };
    const historyHash = sha(historyHashBase);
    const detached = createDetachedSignature("evidence", "policy-governance-change", { ...historyHashBase, historyHash, createdAt, actor });
    const record: GovernancePolicyVersionRecord = {
      id: `policy-${policyKey}-v${version}-${Date.now()}`,
      trustId,
      policyType: input.policyType,
      policyKey,
      title: input.title,
      version,
      status: input.activate ? "active" : "draft",
      content: input.content || {},
      changeSummary: input.changeSummary || null,
      approvedBy: input.activate ? actor : null,
      approvedAt: input.activate ? createdAt : null,
      createdAt,
      createdBy: actor,
      previousVersionId: previous?.id || null,
      signature: detached.signature,
      signatureEnvelope: { algorithm: detached.algorithm, keyId: detached.keyId, scope: detached.scope, signedAt: detached.signedAt, signerIdentity: detached.signerIdentity, publicKeyFingerprint: detached.publicKeyFingerprint },
      historyHash,
    };
    const before = structuredClone((db.settings as Record<string, any>)?.policyGovernance || {});
    db.policyVersions = [record, ...(db.policyVersions || []).map((item) => item.policyType === record.policyType && item.trustId === trustId && input.activate && item.status === "active" ? { ...item, status: "superseded" as const } : item)];
    const settings = db.settings as Record<string, any>;
    const pg = { ...(settings.policyGovernance as Record<string, any> || {}) };
    pg.versionHistory = [
      { id: record.id, policyType: record.policyType, version: record.version, title: record.title, createdAt, createdBy: actor, historyHash, signature: record.signature, keyId: record.signatureEnvelope.keyId, status: record.status },
      ...((pg.versionHistory || [])),
    ].slice(0, 100);
    pg.activeVersionIds = { ...(pg.activeVersionIds || {}), ...(input.activate ? { [record.policyType]: record.id } : {}) };
    settings.policyGovernance = pg;
    db.settings = settings;
    db.addAudit("POLICY_VERSION_CREATED", "governance-policy", record.id, before, pg, { trustId, policyType: record.policyType, version: record.version, historyHash, signatureKeyId: record.signatureEnvelope.keyId }, actor);
    await db.persist("policy-version-created");
    return { version: record, activeVersionIds: pg.activeVersionIds };
  }

  async activatePolicyVersion(context: RequestContext, policyType: GovernancePolicyVersionRecord["policyType"], versionId: string) {
    assertAuthorized(context, "settings.write", "Activating policy version");
    const { trustId } = resolveTrustId(context);
    const actor = getActor(context);
    const target = (db.policyVersions || []).find((item) => item.id === versionId && item.trustId === trustId && item.policyType === policyType);
    if (!target) { const error: any = new Error("Policy version not found."); error.statusCode = 404; throw error; }
    db.policyVersions = (db.policyVersions || []).map((item) => item.trustId !== trustId || item.policyType !== policyType ? item : item.id === versionId ? { ...item, status: "active", approvedAt: nowIso(), approvedBy: actor } : item.status === "active" ? { ...item, status: "superseded" } : item);
    const settings = db.settings as Record<string, any>;
    const before = structuredClone(settings.policyGovernance || {});
    settings.policyGovernance = { ...(settings.policyGovernance as Record<string, any> || {}), activeVersionIds: { ...((settings.policyGovernance as Record<string, any> || {}).activeVersionIds || {}), [policyType]: versionId }, versionHistory: [
      { id: versionId, policyType, action: "activated", activatedAt: nowIso(), activatedBy: actor },
      ...((((settings.policyGovernance as Record<string, any> || {}).versionHistory) || [])),
    ].slice(0, 100) };
    db.settings = settings;
    db.addAudit("POLICY_VERSION_ACTIVATED", "governance-policy", versionId, before, settings.policyGovernance as Record<string, unknown>, { trustId, policyType }, actor);
    await db.persist("policy-version-activated");
    return this.listPolicyVersions(context);
  }
}

export const policyVersionService = new PolicyVersionService();
