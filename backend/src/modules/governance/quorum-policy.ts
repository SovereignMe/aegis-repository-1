export type ApprovalDecision = 'approved' | 'rejected';
export type QuorumPolicy = {
  minimumApprovals: number;
  requiredRoles?: string[];
  uniqueActorsOnly?: boolean;
};
export type ApprovalVote = { actorId: string; actorRole: string; decision: ApprovalDecision };

export function evaluateQuorum(policy: QuorumPolicy, votes: ApprovalVote[]) {
  const approvals = votes.filter((v) => v.decision === 'approved');
  const actorSet = new Set(approvals.map((v) => v.actorId));
  const uniqueOk = policy.uniqueActorsOnly !== false ? actorSet.size === approvals.length : true;
  const roleOk = !policy.requiredRoles?.length || policy.requiredRoles.every((role) => approvals.some((v) => v.actorRole === role));
  const countOk = approvals.length >= Math.max(1, policy.minimumApprovals || 1);
  return { satisfied: uniqueOk && roleOk && countOk, approvals: approvals.length, uniqueOk, roleOk, countOk };
}


export function assertQuorumSatisfied(policy: QuorumPolicy, votes: ApprovalVote[], actionLabel = "approval action") {
  const result = evaluateQuorum(policy, votes);
  if (!result.satisfied) {
    const missingRoles = (policy.requiredRoles || []).filter((role) => !votes.filter((v) => v.decision === "approved").some((v) => v.actorRole === role));
    throw new Error(`Quorum not satisfied for ${actionLabel}. approvals=${result.approvals}/${Math.max(1, policy.minimumApprovals || 1)}${missingRoles.length ? ` missing_roles=${missingRoles.join(",")}` : ""}`);
  }
  return result;
}
