import React from 'react';

type Issue = { severity?: string; area?: string; issue?: string };

type Props = {
  verificationStatus?: string;
  anchorStatus?: string;
  signatureStatus?: string;
  artifactCount?: number;
  openIssues?: Issue[];
};

export function VerificationWorkflowPanel({
  verificationStatus = 'Verified',
  anchorStatus = 'Pending',
  signatureStatus = 'Ready',
  artifactCount = 0,
  openIssues = [],
}: Props) {
  const statusTone = openIssues.length ? 'warn' : 'ok';

  return (
    <div className="premium-surface" aria-label="Verification workflow panel" style={{ padding: 20, borderRadius: 18, marginTop: 18 }}>
      <div className="small-label">END-TO-END VERIFICATION</div>
      <div className="large-title" style={{ fontSize: 22, marginTop: 6 }}>Verification Workflow Status</div>
      <div className="muted-inline" style={{ marginTop: 6 }}>
        Track integrity, artifact verification, anchor state, and operator readiness from one governed surface.
      </div>

      <div className="governance-current-action-metrics" style={{ marginTop: 18 }}>
        <div className={`governance-status-badge ${statusTone}`} aria-label="overall verification status">{verificationStatus}</div>
        <div className="governance-status-badge" aria-label="signature status">Signatures: {signatureStatus}</div>
        <div className="governance-status-badge" aria-label="anchor status">Anchor: {anchorStatus}</div>
        <div className="governance-status-badge" aria-label="artifact count">Artifacts: {artifactCount}</div>
      </div>

      <div className="governance-list-stack compact" style={{ marginTop: 18 }}>
        <div className="governance-list-item compact"><div>Step 1</div><strong>Approval signed</strong></div>
        <div className="governance-list-item compact"><div>Step 2</div><strong>Bundle generated</strong></div>
        <div className="governance-list-item compact"><div>Step 3</div><strong>Verification persisted</strong></div>
        <div className="governance-list-item compact"><div>Step 4</div><strong>Public-proof anchor attempted</strong></div>
      </div>

      <div style={{ marginTop: 18 }}>
        <button className="btn btn-primary" type="button" aria-label="View verification report">VIEW VERIFICATION REPORT</button>
        <button className="btn" type="button" aria-label="Review anchor receipt" style={{ marginLeft: 12 }}>REVIEW ANCHOR RECEIPT</button>
      </div>
    </div>
  );
}
