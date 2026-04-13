import { useEffect, useState } from "react";
import { governanceService } from "../../../services/governanceService";

export function PublicProofArtifactStatus({ packetId }: { packetId: string }) {
  const [status, setStatus] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    governanceService.getPacketArtifactStatus(packetId).then((value: any) => { if (!cancelled) setStatus(value); }).catch(() => { if (!cancelled) setStatus(null); });
    return () => { cancelled = true; };
  }, [packetId]);

  if (!packetId) return null;
  return (
    <div className="premium-surface" style={{ padding: 16 }}>
      <div className="small-label">Public-Proof Artifact Status</div>
      <div className="muted-inline" style={{ marginTop: 8 }}>Anchor status: {status?.status || 'pending'}</div>
      <div className="muted-inline">Verification: {status?.verificationStatus || 'pending'}</div>
      <div className="muted-inline">Provider: {status?.publicProofProvider || 'opentimestamps'}</div>
      <div className="muted-inline">Anchor ref: {status?.anchorRef || 'Awaiting receipt'}</div>
    </div>
  );
}
