import crypto from "node:crypto";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../../config/env.js";
import { createDetachedSignature } from "./signing-model.js";

const execFileAsync = promisify(execFile);

export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalize(item)}`).join(",")}}`;
}

export function sha256Text(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
export async function sha256Path(filePath: string) { const buffer = await fs.readFile(filePath); return crypto.createHash("sha256").update(buffer).digest("hex"); }

export async function runTemplatedCommand(template: string, replacements: Record<string, string>) {
  if (!template) return null;
  const [command, ...args] = template.split(" ");
  const resolvedArgs = args.map((arg) => Object.entries(replacements).reduce((value, [key, replacement]) => value.replaceAll(`{{${key}}}`, replacement), arg));
  const result = await execFileAsync(command, resolvedArgs);
  return `${result.stdout || ""}`.trim() || `${result.stderr || ""}`.trim() || null;
}

export async function createTimestampEnvelope(input: {
  generatedAt: string;
  manifestHash: string;
  packetCode: string;
  timestampPayloadBase: Record<string, unknown>;
  trustedTimestamp?: Record<string, any>;
}) {
  const mode = String(input.trustedTimestamp?.mode || env.evidenceTimestampMode || "local-equivalent");
  const provider = String(input.trustedTimestamp?.provider || env.evidenceTimestampProvider || "local-equivalent");
  const authorityUrl = String(input.trustedTimestamp?.authorityUrl || env.evidenceTimestampAuthorityUrl || "");
  const commandToken = (mode === "command" || mode === "rfc3161")
    ? await runTemplatedCommand(env.evidenceTimestampCommand || "", {
        hash: input.manifestHash,
        packet_code: input.packetCode,
        authority_url: authorityUrl,
      }).catch(() => null)
    : null;

  const unsignedPayload = {
    ...input.timestampPayloadBase,
    manifestHash: input.manifestHash,
    token: commandToken,
    mode,
    issuedBy: provider,
    authorityUrl: authorityUrl || null,
    signedAt: input.generatedAt,
  };

  if (!commandToken && mode === "disabled") {
    return { ...unsignedPayload, token: null, issuedBy: provider, signature: null };
  }

  const equivalentToken = commandToken || crypto.createHash("sha256").update(JSON.stringify({ provider, manifestHash: input.manifestHash, issuedAt: input.generatedAt, packetCode: input.packetCode })).digest("hex");
  return {
    ...unsignedPayload,
    token: equivalentToken,
    signature: createDetachedSignature("evidence", "timestamp", { ...unsignedPayload, token: equivalentToken }, input.generatedAt).signature,
  };
}

export async function setImmutableReadOnly(targetPath: string) { await fs.chmod(targetPath, 0o444).catch(() => undefined); }
