import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { env } from '../src/config/env.js';
import { db } from '../src/services/inMemoryStore.js';
import { setupApp, bootstrapAdmin, createMultipartPayload } from './integration.helpers.js';

test('upload integration: valid multipart upload persists and mismatched content is quarantined', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token;

  const goodUpload = createMultipartPayload(
    { title: 'Trust Narrative', docType: 'correspondence', jurisdiction: 'ADMINISTRATIVE' },
    { filename: 'narrative.txt', contentType: 'text/plain', content: 'This is a plain text trust administration note.' },
  );
  const goodResponse = await app.inject({
    method: 'POST',
    url: '/documents/upload',
    headers: { authorization: `Bearer ${token}`, 'content-type': goodUpload.contentType },
    payload: goodUpload.payload,
  });
  assert.equal(goodResponse.statusCode, 200);
  const goodBody = goodResponse.json();
  assert.equal(goodBody.uploadStatus, 'ready');
  assert.equal(typeof goodBody.storagePath, 'string');
  const goodFile = await fs.readFile(goodBody.storagePath, 'utf8');
  assert.match(goodFile, /plain text trust administration note/i);

  const badUpload = createMultipartPayload(
    { title: 'Suspicious Payload', docType: 'correspondence', jurisdiction: 'ADMINISTRATIVE' },
    { filename: 'payload.txt', contentType: 'text/plain', content: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x00, 0x01, 0x02, 0x03]) },
  );
  const badResponse = await app.inject({
    method: 'POST',
    url: '/documents/upload',
    headers: { authorization: `Bearer ${token}`, 'content-type': badUpload.contentType },
    payload: badUpload.payload,
  });
  assert.equal(badResponse.statusCode, 400);
  const badBody = badResponse.json();
  assert.equal(badBody.uploadStatus, 'quarantined');
  assert.equal(typeof badBody.documentId, 'string');

  const quarantinedDoc = db.documents.find((item) => item.id === badBody.documentId);
  assert.ok(quarantinedDoc);
  assert.equal(quarantinedDoc?.uploadStatus, 'quarantined');
  assert.equal(quarantinedDoc?.storagePath?.startsWith(env.quarantineDir), true);
  assert.match(String(quarantinedDoc?.quarantineReason || ''), /mime|type|match|allowed/i);
});
