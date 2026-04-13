import React from 'react';

export default function AnchorAndQuorumStatus({ verification, quorum }: { verification?: any; quorum?: any }) {
  return (
    <div className="rounded-2xl border p-4 space-y-2">
      <h3 className="text-sm font-semibold">Integrity & Quorum</h3>
      <div className="text-sm">Anchor status: <strong>{verification?.anchorStatus || 'pending'}</strong></div>
      <div className="text-sm">Anchor provider: <strong>{verification?.anchorProvider || 'opentimestamps'}</strong></div>
      <div className="text-sm">Quorum: <strong>{quorum?.approvals || 0}/{quorum?.minimumApprovals || 2}</strong></div>
      <div className="text-sm">Role diversity: <strong>{quorum?.roleOk ? 'valid' : 'pending'}</strong></div>
    </div>
  );
}
