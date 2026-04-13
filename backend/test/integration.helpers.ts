import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server.js';
import { db } from '../src/services/inMemoryStore.js';

export async function setupApp() {
  await db.resetForTests();
  const app = await buildApp() as FastifyInstance;
  return app;
}

export async function bootstrapAdmin(app: FastifyInstance, overrides: Partial<{ email: string; fullName: string; password: string }> = {}) {
  const payload = {
    email: overrides.email || 'admin@example.com',
    fullName: overrides.fullName || 'Administrative Trustee',
    password: overrides.password || 'TempAdminPass!2026',
  };
  const response = await app.inject({ method: 'POST', url: '/auth/bootstrap-admin', payload });
  return { response, body: response.json(), payload };
}

export async function createManagedUser(app: FastifyInstance, token: string, payload: { email: string; fullName: string; role: 'VIEWER' | 'EDITOR' | 'ADMIN'; password: string }) {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/users',
    headers: { authorization: `Bearer ${token}` },
    payload,
  });
  return { response, body: response.json() };
}

export async function login(app: FastifyInstance, email: string, password: string) {
  const response = await app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
  return { response, body: response.json() };
}

export function createMultipartPayload(fields: Record<string, string>, file?: { fieldName?: string; filename: string; contentType: string; content: Buffer | string }) {
  const boundary = '----hlh-test-boundary-' + Date.now().toString(36);
  const chunks: Buffer[] = [];
  for (const [name, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${name}"\r\n\r\n`));
    chunks.push(Buffer.from(String(value)));
    chunks.push(Buffer.from('\r\n'));
  }
  if (file) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(Buffer.from(`Content-Disposition: form-data; name="${file.fieldName || 'file'}"; filename="${file.filename}"\r\n`));
    chunks.push(Buffer.from(`Content-Type: ${file.contentType}\r\n\r\n`));
    chunks.push(Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content));
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    payload: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
