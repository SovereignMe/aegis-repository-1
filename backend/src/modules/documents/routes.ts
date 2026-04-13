import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { requireAuthorized } from "../../services/authorization.service.js";
import { env } from "../../config/env.js";
import { requestContext } from "../shared/http.js";
import { documentModuleServices } from "./interfaces.js";
import { documentValidators } from "./validators.js";
import { withErrorResponses } from "../shared/route-contracts.js";

export async function registerDocumentRoutes(app: any) {
  const { documents } = documentModuleServices;

  app.get("/documents", { preHandler: requireAuthorized("documents.read"), schema: withErrorResponses({ querystring: documentValidators.qQuery }) }, async (request: any) => documents.listDocuments(requestContext(request), request.query?.q));
  app.post("/documents", { preHandler: requireAuthorized("documents.create"), schema: withErrorResponses({ body: documentValidators.documentBody }) }, async (request: any) => documents.createDocument(requestContext(request), request.body));
  app.post("/documents/upload", { preHandler: requireAuthorized("documents.create") }, async (request: any, reply: any) => {
    try {
      await fs.mkdir(env.uploadTempDir, { recursive: true });
      const parts = request.parts();
      const fields: Record<string, string> = {};
      let tempPath = "";
      let originalFileName = "";
      let mimeType = "application/octet-stream";
      let byteLength = 0;
      for await (const part of parts) {
        if (part.type === "file") {
          if (tempPath) {
            const extraError: any = new Error("Only one file upload is supported per request.");
            extraError.statusCode = 400;
            throw extraError;
          }
          originalFileName = part.filename || "upload.bin";
          mimeType = part.mimetype || "application/octet-stream";
          tempPath = path.join(env.uploadTempDir, `${Date.now()}-${originalFileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
          const writeStream = createWriteStream(tempPath, { flags: "wx" });
          part.file.on("data", (chunk: Buffer) => {
            byteLength += chunk.length;
            if (byteLength > env.uploadMaxBytes) part.file.destroy(new Error("Upload exceeded size limit."));
          });
          await pipeline(part.file, writeStream);
        } else {
          fields[part.fieldname] = String(part.value || "");
        }
      }
      if (!tempPath) return reply.code(400).send({ message: "No file was provided." });
      return await documents.createUploadedDocument(requestContext(request), {
        title: fields.title || originalFileName,
        docType: fields.docType || "correspondence",
        jurisdiction: fields.jurisdiction || "ADMINISTRATIVE",
        status: fields.status || "pending",
        summary: fields.summary || "",
        notes: fields.notes || "",
        fileName: originalFileName,
        originalFileName,
        mimeType,
        tempPath,
        byteLength,
      });
    } catch (error: any) {
      return reply.code(error.statusCode || 400).send({ message: error.message, ...(error.payload || {}) });
    }
  });

  app.get("/documents/:id/download", { preHandler: requireAuthorized("documents.read"), schema: { params: documentValidators.idParam } }, async (request: any, reply: any) => {
    const document = documents.findDocument(request.params.id, requestContext(request).user.activeTrustId);
    if (!document?.storagePath) return reply.code(404).send({ message: "No file is attached to this document." });
    const stat = await fs.stat(document.storagePath).catch(() => null);
    if (!stat) return reply.code(404).send({ message: "Attached file is unavailable." });
    reply.header("Content-Type", document.sniffedMimeType || document.mimeType || "application/octet-stream");
    reply.header("Content-Length", String(stat.size));
    reply.header("Content-Disposition", `attachment; filename="${document.originalFileName || document.fileName || document.id}"`);
    return reply.send(createReadStream(document.storagePath));
  });

  app.get("/documents/:id/file-metadata", { preHandler: requireAuthorized("documents.read"), schema: { params: documentValidators.idParam } }, async (request: any, reply: any) => {
    const document = documents.findDocument(request.params.id, requestContext(request).user.activeTrustId);
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

  app.get("/documents/:id/verification", { preHandler: requireAuthorized("documents.read"), schema: { params: documentValidators.idParam } }, async (request: any, reply: any) => {
    try {
      return await documents.getVerificationSummary(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(404).send({ message: error.message });
    }
  });

  app.get("/documents/:id/verification-report", { preHandler: requireAuthorized("documents.read"), schema: { params: documentValidators.idParam } }, async (request: any, reply: any) => {
    try {
      return await documents.getVerificationReport(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(404).send({ message: error.message });
    }
  });

  app.patch("/documents/:id/archive", { preHandler: requireAuthorized("documents.archive"), schema: { params: documentValidators.idParam } }, async (request: any, reply: any) => {
    try {
      return await documents.archiveDocument(requestContext(request), request.params.id);
    } catch (error: any) {
      return reply.code(404).send({ message: error.message });
    }
  });
}