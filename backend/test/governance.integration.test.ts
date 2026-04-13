import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { setupApp, bootstrapAdmin, createManagedUser, login } from './integration.helpers.js';

test('governance integration: beneficiary, distribution, notice, packet generation, and bundle download complete end-to-end', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token;

  const approverPassword = 'ApproverPass!2026';
  const managed = await createManagedUser(app, token, {
    email: 'approver@example.com',
    fullName: 'Approving Trustee',
    role: 'ADMIN',
    password: approverPassword,
  });
  assert.equal(managed.response.statusCode, 200);
  const approverLogin = await login(app, 'approver@example.com', approverPassword);
  assert.equal(approverLogin.response.statusCode, 200);
  const approverToken = approverLogin.body.token;

  const secondApproverPassword = 'SecondApproverPass!2026';
  const secondManaged = await createManagedUser(app, token, {
    email: 'second-approver@example.com',
    fullName: 'Second Approving Trustee',
    role: 'ADMIN',
    password: secondApproverPassword,
  });
  assert.equal(secondManaged.response.statusCode, 200);
  const secondApproverLogin = await login(app, 'second-approver@example.com', secondApproverPassword);
  assert.equal(secondApproverLogin.response.statusCode, 200);
  const secondApproverToken = secondApproverLogin.body.token;

  const beneficiaryResponse = await app.inject({
    method: 'POST',
    url: '/governance/beneficiaries',
    headers: { authorization: `Bearer ${token}` },
    payload: { fullName: 'Family Beneficiary', allocationPercent: 100 },
  });
  assert.equal(beneficiaryResponse.statusCode, 200);
  const beneficiary = beneficiaryResponse.json();

  const sourceDocumentId = '2af9187d-c8f1-4cef-8a1e-6470d7db631c';
  const distributionResponse = await app.inject({
    method: 'POST',
    url: '/governance/distributions',
    headers: { authorization: `Bearer ${token}` },
    payload: { beneficiaryId: beneficiary.id, amount: 250, documentId: sourceDocumentId, category: 'education', notes: 'Requested beneficiary support for approved educational expense.', reasonCode: 'BENEFICIARY_SUPPORT' },
  });
  assert.equal(distributionResponse.statusCode, 200);
  const distribution = distributionResponse.json().distribution;

  const approveResponse = await app.inject({
    method: 'PATCH',
    url: `/governance/distributions/${distribution.id}/approve`,
    headers: { authorization: `Bearer ${approverToken}` },
    payload: { notes: 'Secondary trustee approval after packet and source review.', reasonCode: 'BENEFICIARY_SUPPORT' },
  });
  assert.equal(approveResponse.statusCode, 200);
  assert.equal(approveResponse.json().distribution.status, 'approved');

  const noticeResponse = await app.inject({
    method: 'POST',
    url: '/governance/notices',
    headers: { authorization: `Bearer ${token}` },
    payload: { recipientName: 'Records Office', recipientAddress: '5904 S Cooper St', documentId: sourceDocumentId },
  });
  assert.equal(noticeResponse.statusCode, 200);
  const notice = noticeResponse.json();

  const serveResponse = await app.inject({
    method: 'PATCH',
    url: `/governance/notices/${notice.id}/serve`,
    headers: { authorization: `Bearer ${token}` },
    payload: { trackingNumber: 'TRACK-12345' },
  });
  assert.equal(serveResponse.statusCode, 200);
  assert.equal(serveResponse.json().status, 'served');

  const packetResponse = await app.inject({
    method: 'POST',
    url: '/governance/packets',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      packetType: 'evidence-package',
      title: 'Evidence Packet',
      documentIds: [sourceDocumentId],
      noticeIds: [notice.id],
      notes: 'Issuance request for evidentiary record bundle.',
      reasonCode: 'EVIDENCE_EXPORT',
    },
  });
  assert.equal(packetResponse.statusCode, 200);
  const packetRequest = packetResponse.json();
  assert.equal(packetRequest.packet.status, 'pending_approval');

  const firstPacketApproval = await app.inject({
    method: 'PATCH',
    url: `/governance/packets/${packetRequest.packet.id}/approve`,
    headers: { authorization: `Bearer ${approverToken}` },
    payload: { notes: 'First packet approval after evidence review.', reasonCode: 'EVIDENCE_EXPORT' },
  });
  assert.equal(firstPacketApproval.statusCode, 200);
  assert.equal(firstPacketApproval.json().packet.status, 'pending_approval');

  const secondPacketApproval = await app.inject({
    method: 'PATCH',
    url: `/governance/packets/${packetRequest.packet.id}/approve`,
    headers: { authorization: `Bearer ${secondApproverToken}` },
    payload: { notes: 'Second packet approval authorizing final bundle generation.', reasonCode: 'EVIDENCE_EXPORT' },
  });
  assert.equal(secondPacketApproval.statusCode, 200);
  const packetBody = secondPacketApproval.json();
  assert.equal(packetBody.packet.status === 'generated' || packetBody.packet.status === 'anchored', true);
  assert.equal(packetBody.evidenceManifest.packetType, 'evidence-package');
  assert.equal(packetBody.includedFiles.length >= 0, true);

  const manifestText = await fs.readFile(packetBody.packet.manifestPath, 'utf8');
  assert.match(manifestText, /Evidence Packet/);
  const bundleStat = await fs.stat(packetBody.packet.bundlePath);
  assert.equal(bundleStat.isFile(), true);
  assert.equal((bundleStat.mode & 0o222) === 0, true);

  const bundleDownload = await app.inject({
    method: 'GET',
    url: `/governance/packets/${packetBody.packet.id}/download`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(bundleDownload.statusCode, 200);
  assert.equal(bundleDownload.headers['content-type'], 'application/zip');
  assert.equal(Number(bundleDownload.headers['content-length']) > 0, true);
});
