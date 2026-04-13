import { sharedSchemas } from "../../services/validation.js";

export const distributionValidators = {
  distributionBody: sharedSchemas.distributionBody,
  approvalDecisionBody: sharedSchemas.approvalDecisionBody,
  idParam: sharedSchemas.idParam,
};
