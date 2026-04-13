import path from "node:path";
import { env } from "../../config/env.js";
import { createDetachedSignature } from "./signing-model.js";
import { createTimestampEnvelope, runTemplatedCommand, sha256Path, setImmutableReadOnly } from "./bundle-signer.js";
import { packetArtifactRepository } from "./packet-artifact-repository.js";
import { anchorHashExternally, verifyExternalAnchor } from "../anchoring/opentimestamps-anchor.js";
import { artifactStatusRepository } from "../artifacts/artifact-status-repository.js";

export class PacketSigningService {
  async writePacketSignatures(assembly: {
    bundleDir: string;
    recordsDir: string;
    recordsGovernance: any;
    generatedAt: string;
    manifestHash: string;
    evidenceManifest: any;
    packetCode: string;
    timestampPayloadBase: any;
    includedFiles: Array<Record<string, unknown>>;
  }) {
    const detachedSignature = {
      ...createDetachedSignature("evidence", "manifest", { manifestHash: assembly.manifestHash, manifest: assembly.evidenceManifest }, assembly.generatedAt),
      manifestHash: assembly.manifestHash,
    };
    await packetArtifactRepository.writeJson(path.join(assembly.bundleDir, "manifest.sig"), detachedSignature);
    const timestampPayload = await createTimestampEnvelope({
      generatedAt: assembly.generatedAt,
      manifestHash: assembly.manifestHash,
      packetCode: assembly.packetCode,
      timestampPayloadBase: assembly.timestampPayloadBase,
      trustedTimestamp: assembly.recordsGovernance.trustedTimestamp,
    });
    await packetArtifactRepository.writeJson(path.join(assembly.bundleDir, "timestamp.json"), timestampPayload);
    await packetArtifactRepository.writeJson(path.join(assembly.bundleDir, "included-files.json"), assembly.includedFiles);
    const verificationSummary = {
      packetCode: assembly.packetCode,
      generatedAt: assembly.generatedAt,
      checksumAlgorithm: assembly.recordsGovernance.checksumAlgorithm,
      manifestHash: assembly.manifestHash,
      bundlePlanned: true,
      watermark: assembly.evidenceManifest.recordsGovernance?.exportWatermark || null,
      keyId: detachedSignature.keyId,
      timestampAuthority: timestampPayload.issuedBy,
      includedFiles: assembly.includedFiles,
    };
    await packetArtifactRepository.writeJson(path.join(assembly.bundleDir, "VERIFICATION.json"), verificationSummary);
    return { detachedSignature, timestampPayload, verificationSummary };
  }

  async packageBundle(assembly: { bundleDir: string; bundleSlug: string; packetCode: string; generatedAt: string; packetId?: string; trustId?: string; manifestHash?: string; }) {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execFileAsync = promisify(execFile);
    const bundlePath = path.join(env.evidenceBundlesDir, `${assembly.bundleSlug}.zip`);
    await execFileAsync("zip", ["-r", "-X", bundlePath, path.basename(assembly.bundleDir)], { cwd: env.evidenceBundlesDir });
    const bundleHash = await sha256Path(bundlePath);
    const bundleSignaturePayload = {
      ...createDetachedSignature("evidence", "bundle", { packetCode: assembly.packetCode, bundleHash, generatedAt: assembly.generatedAt }, assembly.generatedAt),
      bundleHash,
    };
    await packetArtifactRepository.writeJson(path.join(assembly.bundleDir, "bundle.sig"), bundleSignaturePayload);
    const externalReceipt = env.evidenceAnchorCommand
      ? { provider: 'opentimestamps' as const, hash: bundleHash, anchoredAt: new Date().toISOString(), anchorRef: `cmd:${assembly.packetCode}`, proof: (await runTemplatedCommand(env.evidenceAnchorCommand, { hash: bundleHash, packet_code: assembly.packetCode })) || undefined, status: 'submitted' as const, publicProof: true }
      : await anchorHashExternally(bundleHash, 'opentimestamps');
    const verification = await verifyExternalAnchor(externalReceipt);
    const anchorReceipt = JSON.stringify({ ...externalReceipt, verification }, null, 2);
    const anchorReceiptPath = path.join(assembly.bundleDir, 'anchor-receipt.txt');
    await packetArtifactRepository.writeText(anchorReceiptPath, anchorReceipt);
    const verificationReceiptPath = path.join(assembly.bundleDir, 'anchor-verification.json');
    await packetArtifactRepository.writeJson(verificationReceiptPath, verification);
    if (assembly.packetId && assembly.trustId) {
      artifactStatusRepository.upsert({
        artifactType: 'packet-bundle',
        artifactId: assembly.packetId,
        packetId: assembly.packetId,
        trustId: assembly.trustId,
        bundlePath,
        bundleHash,
        manifestHash: assembly.manifestHash || null,
        publicProofProvider: externalReceipt.provider,
        status: verification.status === 'confirmed' ? 'confirmed' : (externalReceipt.status || 'submitted'),
        verificationStatus: verification.verified ? 'verified' : 'pending',
        anchorRef: externalReceipt.anchorRef,
        anchorProof: externalReceipt.proof || null,
        anchorReceiptPath,
        verificationReceiptPath,
        failureReason: (externalReceipt as any).failureReason || null,
        lastCheckedAt: verification.checkedAt,
      });
    }
    return { bundlePath, bundleHash, bundleSignaturePayload, anchorReceipt, externalReceipt, verification, anchorReceiptPath, verificationReceiptPath };
  }

  async applyImmutableRetention(targets: string[]) {
    for (const target of targets) await setImmutableReadOnly(target);
  }
}

export const packetSigningService = new PacketSigningService();
