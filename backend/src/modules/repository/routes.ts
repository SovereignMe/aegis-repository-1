import { requireAuthorized } from "../../services/authorization.service.js";
import { requestContext } from "../shared/http.js";
import { repositoryModuleServices } from "./interfaces.js";
import { repositoryValidators } from "./validators.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerRepositoryRoutes(app: any) {
  const { repository } = repositoryModuleServices;

  app.get("/repository/documents/:id/file-metadata", { preHandler: requireAuthorized("documents.read"), schema: withErrorResponses({ params: repositoryValidators.idParam }) }, async (request: any, reply: any) => {
    const document = repository.findDocument(request.params.id, requestContext(request).user.activeTrustId);
    if (!document?.metadataPayload) return reply.code(404).send({ message: "No signed file metadata is available for this document." });
    return {
      payload: document.metadataPayload,
      signature: document.metadataSignature,
      signedAt: document.metadataSignedAt,
      uploadStatus: document.uploadStatus,
      quarantineReason: document.quarantineReason,
      indexingStatus: document.indexingStatus,
      ocrStatus: document.ocrStatus,
    };
  });

  app.get("/repository/documents/:id/verification", { preHandler: requireAuthorized("documents.read"), schema: withErrorResponses({ params: repositoryValidators.idParam }) }, async (request: any, reply: any) => {
    try {
      return await repository.getVerificationSummary(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(404).send({ message: error.message });
    }
  });
}