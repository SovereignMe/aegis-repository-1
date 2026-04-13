export interface ArtifactStatusSummary {
  packetId?: string;
  artifactId?: string;
  verificationStatus?: "pending" | "verified" | "failed" | "stale" | "revoked";
  anchorStatus?: "pending" | "confirmed" | "failed";
  provider?: string;
  manifestHash?: string;
  bundleHash?: string;
  anchorRef?: string;
  lastCheckedAt?: string;
  failureReason?: string | null;
}

export interface GovernanceMutationResponse {
  ok?: boolean;
  id?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}
