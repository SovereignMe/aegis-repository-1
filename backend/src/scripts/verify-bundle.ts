import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { verifyDetachedSignature } from "../modules/governance/signing-model.js";
import { canonicalize } from "../modules/governance/bundle-signer.js";

function sha256(buffer: Buffer | string) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function main() {
  const target = process.argv[2];
  const zipPath = process.argv[3] || "";
  if (!target) {
    console.error("Usage: npm run verify:bundle -- <bundle-dir> [bundle.zip]");
    process.exit(1);
  }
  const manifest = JSON.parse(await fs.readFile(path.join(target, "records", "manifest.json"), "utf8"));
  const manifestSig = JSON.parse(await fs.readFile(path.join(target, "manifest.sig"), "utf8"));
  const verification = JSON.parse(await fs.readFile(path.join(target, "VERIFICATION.json"), "utf8"));
  const includedFiles = JSON.parse(await fs.readFile(path.join(target, "included-files.json"), "utf8"));
  const manifestHash = sha256(canonicalize(manifest));
  const manifestVerified = verifyDetachedSignature({ manifestHash, manifest }, manifestSig.signature, manifestSig.publicKeyPem);
  const fileResults = [] as Array<{ bundledFileName: string; expected: string; actual: string; valid: boolean }>;
  for (const item of includedFiles as Array<any>) {
    const filePath = path.join(target, "files", String(item.bundledFileName));
    const actual = sha256(await fs.readFile(filePath));
    fileResults.push({ bundledFileName: String(item.bundledFileName), expected: String(item.sha256), actual, valid: actual === String(item.sha256) });
  }
  let bundle = null;
  if (zipPath) {
    const bundleSigPath = path.join(target, "bundle.sig");
    const bundleSig = JSON.parse(await fs.readFile(bundleSigPath, "utf8"));
    const bundleHash = sha256(await fs.readFile(zipPath));
    const verified = verifyDetachedSignature({ packetCode: bundleSig.packetCode, bundleHash, generatedAt: bundleSig.generatedAt }, bundleSig.signature, bundleSig.publicKeyPem);
    bundle = { path: zipPath, bundleHash, verified, keyId: bundleSig.keyId };
  }
  const result = {
    manifest: { valid: manifestVerified, manifestHash, keyId: manifestSig.keyId, signer: manifestSig.signerIdentity || manifestSig.signer?.identity || null },
    bundle,
    verificationSummary: verification,
    files: fileResults,
    ok: manifestVerified && fileResults.every((item) => item.valid) && (bundle ? bundle.verified : true),
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(2);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
