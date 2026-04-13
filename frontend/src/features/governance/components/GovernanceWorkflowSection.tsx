// @ts-nocheck
import { useEffect, useMemo, useState } from "react";

export function GovernanceWorkflowSection({ overview, artifacts, documents, reasonCodes, canWrite, canDistribute, onCreateBeneficiary, onRequestDistribution, onApproveDistribution }) {
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [allocationPercent, setAllocationPercent] = useState("0");
  const [distributionBeneficiaryId, setDistributionBeneficiaryId] = useState(artifacts?.beneficiaries?.[0]?.id || "");
  const [distributionAmount, setDistributionAmount] = useState("0");
  const [distributionNotes, setDistributionNotes] = useState("");
  const [distributionReasonCode, setDistributionReasonCode] = useState("BENEFICIARY_SUPPORT");
  const [distributionApprovalId, setDistributionApprovalId] = useState("");
  const [distributionApprovalNotes, setDistributionApprovalNotes] = useState("");
  const [distributionApprovalReasonCode, setDistributionApprovalReasonCode] = useState("BENEFICIARY_SUPPORT");

  const pendingDistributions = useMemo(
    () => (artifacts?.distributions || []).filter((item) => ["requested", "pending_approval"].includes(item.status)),
    [artifacts],
  );

  useEffect(() => {
    if (!distributionBeneficiaryId && artifacts?.beneficiaries?.length) {
      setDistributionBeneficiaryId(artifacts.beneficiaries[0].id);
    }
  }, [artifacts, distributionBeneficiaryId]);

  useEffect(() => {
    if (!distributionApprovalId && pendingDistributions.length) {
      setDistributionApprovalId(pendingDistributions[0].id);
    }
    if (distributionApprovalId && !pendingDistributions.some((item) => item.id === distributionApprovalId)) {
      setDistributionApprovalId(pendingDistributions[0]?.id || "");
    }
  }, [pendingDistributions, distributionApprovalId]);

  const selectedPendingDistribution = pendingDistributions.find((item) => item.id === distributionApprovalId) || null;

  const handleCreateBeneficiary = () => {
    if (!beneficiaryName) return;
    onCreateBeneficiary({ fullName: beneficiaryName, allocationPercent: Number(allocationPercent || 0) });
    setBeneficiaryName("");
    setAllocationPercent("0");
  };

  const handleRequestDistribution = () => {
    if (!distributionBeneficiaryId) return;
    onRequestDistribution({
      beneficiaryId: distributionBeneficiaryId,
      amount: Number(distributionAmount || 0),
      reasonCode: distributionReasonCode,
      notes: distributionNotes,
    });
    setDistributionAmount("0");
    setDistributionNotes("");
  };

  const handleApproveDistribution = () => {
    if (!selectedPendingDistribution) return;
    onApproveDistribution(selectedPendingDistribution.id, {
      notes: distributionApprovalNotes,
      reasonCode: distributionApprovalReasonCode,
    });
    setDistributionApprovalNotes("");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
      <div className="premium-surface" style={{ padding: 16, borderRadius: 18 }}>
        <div className="small-label">APPROVAL READINESS SNAPSHOT</div>
        <div className="muted-inline" style={{ marginBottom: 12 }}>
          Orphan docs: {overview?.orphanDocuments?.length || 0} • Invalid authority links: {overview?.invalidAuthority?.length || 0} • Pending approvals: {pendingDistributions.length}
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>Document</th><th>Exhibit</th><th>Ledger Link</th></tr></thead>
            <tbody>
              {(documents || []).slice(0, 6).map((document) => {
                const linked = artifacts?.trustLedgerEntries?.some((entry) => entry.documentId === document.id);
                return <tr key={document.id}><td>{document.displayId}</td><td>{document.exhibitCode || "Missing"}</td><td>{linked ? "Linked" : "Missing"}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="premium-surface" style={{ padding: 16, borderRadius: 18 }}>
        <div className="small-label">BENEFICIARY / DISTRIBUTION WORKFLOW</div>
        <div className="intake-grid premium-form-grid" style={{ marginTop: 12 }}>
          <input className="form-input" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Beneficiary name" />
          <input className="form-input" value={allocationPercent} onChange={(e) => setAllocationPercent(e.target.value)} placeholder="Allocation %" />
        </div>
        <div className="action-cluster" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={!canWrite || !beneficiaryName.trim()} onClick={handleCreateBeneficiary}>ADD BENEFICIARY</button>
        </div>

        <div className="intake-grid premium-form-grid" style={{ marginTop: 16 }}>
          <select className="form-input" value={distributionBeneficiaryId} onChange={(e) => setDistributionBeneficiaryId(e.target.value)}>
            <option value="">Select beneficiary</option>
            {(artifacts?.beneficiaries || []).map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}
          </select>
          <input className="form-input" value={distributionAmount} onChange={(e) => setDistributionAmount(e.target.value)} placeholder="Amount" />
          <select className="form-input" value={distributionReasonCode} onChange={(e) => setDistributionReasonCode(e.target.value)}>{reasonCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select>
          <input className="form-input" value={distributionNotes} onChange={(e) => setDistributionNotes(e.target.value)} placeholder="Request notes / fiduciary basis" />
        </div>
        <div className="action-cluster" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" disabled={!canWrite || !distributionBeneficiaryId} onClick={handleRequestDistribution}>REQUEST DISTRIBUTION</button>
        </div>

        <div className="intake-grid premium-form-grid" style={{ marginTop: 12 }}>
          <select className="form-input" value={distributionApprovalId} onChange={(e) => setDistributionApprovalId(e.target.value)}>
            <option value="">Select pending distribution</option>
            {pendingDistributions.map((item) => (
              <option key={item.id} value={item.id}>{item.beneficiaryId} · {item.amount} · {item.status}</option>
            ))}
          </select>
          <select className="form-input" value={distributionApprovalReasonCode} onChange={(e) => setDistributionApprovalReasonCode(e.target.value)}>{reasonCodes.map((code) => <option key={code} value={code}>{code}</option>)}</select>
          <input className="form-input" value={distributionApprovalNotes} onChange={(e) => setDistributionApprovalNotes(e.target.value)} placeholder="Approval notes / checker rationale" />
        </div>
        {selectedPendingDistribution ? (
          <div className="hint-disclaimer" style={{ marginTop: 10 }}>
            Ready to approve distribution {selectedPendingDistribution.id} for {selectedPendingDistribution.amount} under {selectedPendingDistribution.reasonCode}.
          </div>
        ) : (
          <div className="hint-disclaimer" style={{ marginTop: 10 }}>No pending distributions currently await approval.</div>
        )}
        <div className="action-cluster" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" disabled={!canDistribute || !selectedPendingDistribution} onClick={handleApproveDistribution}>APPROVE SELECTED PENDING</button>
        </div>
      </div>
    </div>
  );
}
