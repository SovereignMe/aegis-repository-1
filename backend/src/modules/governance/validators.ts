import { sharedSchemas } from "../../services/validation.js";

export const governanceValidators = {
  beneficiaryBody: sharedSchemas.beneficiaryBody,
  packetBody: sharedSchemas.packetBody,
  approvalDecisionBody: sharedSchemas.approvalDecisionBody,
  policyVersionBody: sharedSchemas.policyVersionBody,
  policyVersionParams: sharedSchemas.policyVersionParams,
  idParam: sharedSchemas.idParam,
};
