import crypto from "node:crypto";

const kind = (process.argv[2] || "access").toLowerCase();
const suffix = process.argv[3] || new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const upper = kind.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
const keyId = `${kind}-ed25519-${suffix}`;
console.log(`# ${kind} key rotation material`);
console.log(`${upper}_SIGNING_KEY_ID=${keyId}`);
console.log(`${upper}_SIGNING_PUBLIC_KEY<<'EOF'`);
console.log(publicKey.export({ type: "spki", format: "pem" }).toString().trim());
console.log("EOF");
console.log(`${upper}_SIGNING_PRIVATE_KEY<<'EOF'`);
console.log(privateKey.export({ type: "pkcs8", format: "pem" }).toString().trim());
console.log("EOF");
console.log(`${upper}_SIGNING_KEY_STORE=managed-rotation`);
console.log(`${upper}_SIGNER_VERSION=${suffix}`);
