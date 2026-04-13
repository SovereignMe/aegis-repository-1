import crypto from "node:crypto";
import type { BeneficiaryRecord, RequestContext } from "../../models/domain.js";
import { assertAuthorized } from "../../services/authorization.service.js";
import { db } from "../../store/governance-store.js";
import { resolveTrustId } from "../../services/tenancy.service.js";
import { governanceAuditWriter } from "./governance-audit-writer.js";

function nowIso() { return new Date().toISOString(); }
function sequence(prefix: string, count: number) { return `${prefix}-${String(count + 1).padStart(4, "0")}`; }

export class BeneficiaryPolicyService {
  async createBeneficiary(context: RequestContext, input: Partial<BeneficiaryRecord>) {
    assertAuthorized(context, "beneficiaries.write", "Creating beneficiaries");
    const createdAt = nowIso();
    const record: BeneficiaryRecord = {
      id: crypto.randomUUID(),
      trustId: resolveTrustId(context, input.trustId || null).trustId,
      beneficiaryCode: input.beneficiaryCode || sequence("BEN", (db.beneficiaries || []).length),
      fullName: String(input.fullName || "").trim(),
      beneficiaryType: input.beneficiaryType || "individual",
      status: input.status || "active",
      allocationPercent: Number(input.allocationPercent || 0),
      notes: input.notes || "",
      immutable: false,
      deletedAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    db.beneficiaries = [record, ...(db.beneficiaries || [])];
    governanceAuditWriter.writeBeneficiaryCreated(context, record);
    await db.withPersistenceBoundary("beneficiary-created", async () => undefined);
    return record;
  }
}
export const beneficiaryPolicyService = new BeneficiaryPolicyService();
