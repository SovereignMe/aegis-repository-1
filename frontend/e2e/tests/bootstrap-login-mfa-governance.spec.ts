import { test, expect } from '@playwright/test';
import { generateTotp } from './totp';

test('bootstrap, login, MFA, and governance packet flow', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('INITIALIZE ADMINISTRATIVE ACCESS')).toBeVisible();
  await page.getByPlaceholder('ADMINISTRATOR FULL NAME').fill('Administrative Trustee');
  await page.getByPlaceholder('ADMINISTRATOR EMAIL').fill('admin@example.com');
  await page.getByPlaceholder('PASSWORD').fill('TempAdminPass!2026');
  await page.getByPlaceholder('CONFIRM PASSWORD').fill('TempAdminPass!2026');
  await page.getByRole('button', { name: 'INITIALIZE ADMIN' }).click();

  await expect(page.getByText('SET A NEW ADMINISTRATIVE PASSWORD')).toBeVisible();
  await page.getByPlaceholder('CURRENT PASSWORD').fill('TempAdminPass!2026');
  await page.getByPlaceholder('NEW PASSWORD').fill('UpgradedAdminPass!2026');
  await page.getByPlaceholder('CONFIRM NEW PASSWORD').fill('UpgradedAdminPass!2026');
  await page.getByRole('button', { name: 'UPDATE PASSWORD' }).click();

  await expect(page.getByText('ENABLE ADMINISTRATOR MFA')).toBeVisible();
  const secret = await page.getByPlaceholder('MANUAL SECRET').inputValue();
  const mfaCode = await generateTotp(secret);
  await page.getByPlaceholder('6-DIGIT AUTHENTICATOR CODE').fill(mfaCode);
  await page.getByRole('button', { name: 'ENABLE MFA' }).click();
  await expect(page.getByText('RECOVERY CODES')).toBeVisible();
  await page.getByRole('button', { name: 'CONTINUE' }).click();

  await expect(page.getByRole('button', { name: 'SIGN OUT' })).toBeVisible();
  await page.getByRole('button', { name: 'SIGN OUT' }).click();

  await expect(page.getByText('GOVERNANCE LOGIN')).toBeVisible();
  await page.getByPlaceholder('EMAIL').fill('admin@example.com');
  await page.getByPlaceholder('PASSWORD').fill('UpgradedAdminPass!2026');
  await page.getByRole('button', { name: 'SIGN IN' }).click();
  await expect(page.getByText('Enter your administrator authentication code to continue.')).toBeVisible();

  const loginCode = await generateTotp(secret);
  await page.getByPlaceholder('6-DIGIT AUTHENTICATOR CODE').fill(loginCode);
  await page.getByRole('button', { name: 'VERIFY MFA' }).click();

  await expect(page.getByText('WORKSPACE NAVIGATION')).toBeVisible();
  await page.getByRole('button', { name: 'GOVERNANCE' }).click();
  await expect(page.getByText('ADMINISTRATIVE RECORD / EVIDENCE EXPORT')).toBeVisible();
  const before = await page.getByText(/Generated packets:/).textContent();
  await page.getByPlaceholder('Packet title').fill('Administrative Record Packet E2E');
  await page.getByRole('button', { name: 'GENERATE PACKAGE' }).click();
  await expect.poll(async () => page.getByText(/Generated packets:/).textContent()).not.toEqual(before);
});
