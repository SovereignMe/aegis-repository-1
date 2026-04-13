import { test, expect } from '@playwright/test';
import { generateTotp } from './totp';

async function bootstrapAndLogin(page: any) {
  await page.goto('/');
  await page.getByPlaceholder('ADMINISTRATOR FULL NAME').fill('Administrative Trustee');
  await page.getByPlaceholder('ADMINISTRATOR EMAIL').fill('admin@example.com');
  await page.getByPlaceholder('PASSWORD').fill('TempAdminPass!2026');
  await page.getByPlaceholder('CONFIRM PASSWORD').fill('TempAdminPass!2026');
  await page.getByRole('button', { name: 'INITIALIZE ADMIN' }).click();
  await page.getByPlaceholder('CURRENT PASSWORD').fill('TempAdminPass!2026');
  await page.getByPlaceholder('NEW PASSWORD').fill('UpgradedAdminPass!2026');
  await page.getByPlaceholder('CONFIRM NEW PASSWORD').fill('UpgradedAdminPass!2026');
  await page.getByRole('button', { name: 'UPDATE PASSWORD' }).click();
  const secret = await page.getByPlaceholder('MANUAL SECRET').inputValue();
  const mfaCode = await generateTotp(secret);
  await page.getByPlaceholder('6-DIGIT AUTHENTICATOR CODE').fill(mfaCode);
  await page.getByRole('button', { name: 'ENABLE MFA' }).click();
  await page.getByRole('button', { name: 'CONTINUE' }).click();
  return secret;
}

test('verification UX renders governed integrity workflow', async ({ page }) => {
  const secret = await bootstrapAndLogin(page);
  await expect(page.getByRole('button', { name: 'SIGN OUT' })).toBeVisible();
  await page.getByRole('button', { name: 'GOVERNANCE' }).click();
  await page.getByRole('button', { name: /AEGIS Verify|Verification/i }).click();
  await expect(page.getByText('Verification Workflow Status')).toBeVisible();
  await expect(page.getByRole('button', { name: 'View verification report' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review anchor receipt' })).toBeVisible();
  await expect(page.getByLabel('overall verification status')).toBeVisible();
  await expect(page.getByLabel('anchor status')).toBeVisible();
  await expect(page.getByText('Public-proof anchor attempted')).toBeVisible();

  await page.getByRole('button', { name: 'SIGN OUT' }).click();
  await page.getByPlaceholder('EMAIL').fill('admin@example.com');
  await page.getByPlaceholder('PASSWORD').fill('UpgradedAdminPass!2026');
  await page.getByRole('button', { name: 'SIGN IN' }).click();
  const loginCode = await generateTotp(secret);
  await page.getByPlaceholder('6-DIGIT AUTHENTICATOR CODE').fill(loginCode);
  await page.getByRole('button', { name: 'VERIFY MFA' }).click();
  await expect(page.getByText('WORKSPACE NAVIGATION')).toBeVisible();
});
