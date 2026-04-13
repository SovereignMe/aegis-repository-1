import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../config/env.js";
import { createDetachedSignature, getManagedSignerSummary } from "../modules/governance/signing-model.js";

const execFileAsync = promisify(execFile);

const mimeToExtensions: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "text/plain": [".txt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

export type FilePipelineStatus = "ready" | "quarantined" | "processing" | "rejected";
export type ExtractionStatus = "disabled" | "pending" | "completed" | "failed";

export interface FileMetadataEnvelope {
  originalFileName: string;
  storedFileName: string;
  declaredMimeType: string;
  sniffedMimeType: string;
  fileSize: number;
  fileHash: string;
  uploadedAt: string;
  uploadStatus: FilePipelineStatus;
}

export function validateUploadMetadata(input: { fileName: string; mimeType: string; byteLength: number }) {
  const extension = path.extname(input.fileName || "").toLowerCase();
  if (!extension || !env.allowedUploadExtensions.includes(extension)) {
    const error = new Error(`File extension ${extension || "(missing)"} is not allowed.`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (!env.allowedUploadMimeTypes.includes(input.mimeType)) {
    const error = new Error(`MIME type ${input.mimeType} is not allowed.`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  const expectedExtensions = mimeToExtensions[input.mimeType] || [];
  if (expectedExtensions.length && !expectedExtensions.includes(extension)) {
    const error = new Error(`File extension ${extension} does not match MIME type ${input.mimeType}.`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (input.byteLength > env.uploadMaxBytes) {
    const error = new Error(`File exceeds the ${env.uploadMaxBytes} byte upload limit.`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
}

export async function sniffContentType(filePath: string) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(4100);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const sample = buffer.subarray(0, bytesRead);
    if (sample.subarray(0, 4).toString("hex") === "25504446") return "application/pdf";
    if (sample.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
    if (sample[0] === 0xff && sample[1] === 0xd8 && sample[2] === 0xff) return "image/jpeg";
    if (sample.subarray(0, 2).toString() === "PK") {
      const body = sample.toString("utf8");
      if (body.includes("word/")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    const isText = sample.every((byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126));
    if (isText) return "text/plain";
    return "application/octet-stream";
  } finally {
    await handle.close();
  }
}

export function assertSniffedMimeAllowed(declaredMimeType: string, sniffedMimeType: string) {
  if (!env.allowedUploadMimeTypes.includes(sniffedMimeType)) {
    const error = new Error(`Detected file type ${sniffedMimeType} is not allowed.`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
  if (declaredMimeType !== sniffedMimeType) {
    const error = new Error(`Declared MIME type ${declaredMimeType} does not match detected type ${sniffedMimeType}.`) as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }
}

export async function sha256File(filePath: string) {
  const hash = crypto.createHash("sha256");
  const handle = await fs.open(filePath, "r");
  try {
    const stream = handle.createReadStream();
    for await (const chunk of stream) hash.update(chunk as Buffer);
    return hash.digest("hex");
  } finally {
    await handle.close();
  }
}

export function signFileMetadata(payload: FileMetadataEnvelope) {
  const detached = createDetachedSignature("metadata", "file-metadata", payload, payload.uploadedAt || new Date().toISOString());
  return JSON.stringify({
    ...detached,
    digestAlgorithm: "sha256",
    payloadDigest: crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    verifier: getManagedSignerSummary("metadata"),
  });
}

export async function runMalwareScan(filePath: string) {
  if (!env.malwareScanCommand) return { ok: true, mode: "disabled" };
  const [command, ...args] = env.malwareScanCommand.split(" ");
  const resolvedArgs = args.map((arg) => arg.replaceAll("{{file}}", filePath));
  await execFileAsync(command, resolvedArgs);
  return { ok: true, mode: "hook", command };
}

export async function quarantineFile(filePath: string, reason: string) {
  await fs.mkdir(env.quarantineDir, { recursive: true });
  const safeName = `${Date.now()}-${path.basename(filePath)}`;
  const quarantinePath = path.join(env.quarantineDir, safeName);
  await fs.rename(filePath, quarantinePath).catch(async () => {
    await fs.copyFile(filePath, quarantinePath);
    await fs.rm(filePath, { force: true });
  });
  return { quarantinePath, reason };
}

async function runOptionalCommand(template: string, filePath: string) {
  const [command, ...args] = template.split(" ");
  const resolvedArgs = args.map((arg) => arg.replaceAll("{{file}}", filePath));
  const result = await execFileAsync(command, resolvedArgs);
  return `${result.stdout || ""}`.trim();
}

export async function runOptionalExtraction(filePath: string, sniffedMimeType: string) {
  let indexingStatus: ExtractionStatus = env.enableIndexing ? "pending" : "disabled";
  let ocrStatus: ExtractionStatus = env.enableOcr ? "pending" : "disabled";
  let extractedText: string | null = null;

  if (sniffedMimeType === "text/plain") {
    extractedText = await fs.readFile(filePath, "utf8");
    indexingStatus = env.enableIndexing ? "completed" : "disabled";
    ocrStatus = env.enableOcr ? "completed" : "disabled";
    return { indexingStatus, ocrStatus, extractedText };
  }

  if (env.enableIndexing && env.indexingCommand) {
    try {
      extractedText = await runOptionalCommand(env.indexingCommand, filePath) || extractedText;
      indexingStatus = "completed";
    } catch {
      indexingStatus = "failed";
    }
  }

  if (env.enableOcr && env.ocrCommand && ["application/pdf", "image/png", "image/jpeg"].includes(sniffedMimeType)) {
    try {
      const ocrText = await runOptionalCommand(env.ocrCommand, filePath);
      extractedText = [extractedText, ocrText].filter(Boolean).join("\n").trim() || extractedText;
      ocrStatus = "completed";
    } catch {
      ocrStatus = "failed";
    }
  }

  return { indexingStatus, ocrStatus, extractedText };
}
