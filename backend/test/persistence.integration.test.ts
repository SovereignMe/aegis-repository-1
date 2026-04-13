import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { env } from '../src/config/env.js';
import { db } from '../src/services/inMemoryStore.js';
import { setupApp, bootstrapAdmin } from './integration.helpers.js';

test('persistence integration: mutations are durably written to state storage', async (t) => {
  const app = await setupApp();
  t.after(async () => { await app.close(); });

  const bootstrap = await bootstrapAdmin(app);
  const token = bootstrap.body.token;

  const contactResponse = await app.inject({
    method: 'POST',
    url: '/contacts',
    headers: { authorization: `Bearer ${token}` },
    payload: { fullName: 'Germaine Hunter', email: 'germaine@example.com', organization: 'HLH' },
  });
  assert.equal(contactResponse.statusCode, 200);
  const contact = contactResponse.json();

  const taskResponse = await app.inject({
    method: 'POST',
    url: '/tasks',
    headers: { authorization: `Bearer ${token}` },
    payload: { title: 'Preserve administrative record', taskType: 'records', contactId: contact.id },
  });
  assert.equal(taskResponse.statusCode, 200);
  const task = taskResponse.json();

  const documentResponse = await app.inject({
    method: 'POST',
    url: '/documents',
    headers: { authorization: `Bearer ${token}` },
    payload: { title: 'Preservation Notice', docType: 'notice', jurisdiction: 'PRIVATE' },
  });
  assert.equal(documentResponse.statusCode, 200);
  const document = documentResponse.json();

  const stateText = await fs.readFile(env.stateFile, 'utf8');
  const state = JSON.parse(stateText);
  assert.equal(state.users.length, 1);
  assert.equal(state.contacts.some((item: any) => item.id === contact.id), true);
  assert.equal(state.tasks.some((item: any) => item.id === task.id), true);
  assert.equal(state.documents.some((item: any) => item.id === document.id), true);
  assert.equal(typeof state.audit[0].hash, 'string');

  assert.equal(db.exportState().documents.some((item) => item.id === document.id), true);
});
