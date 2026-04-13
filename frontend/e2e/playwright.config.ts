import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run dev --workspace backend',
      url: 'http://127.0.0.1:4000/auth/bootstrap-status',
      reuseExistingServer: !process.env.CI,
      cwd: '..',
      env: {
        ...process.env,
        NODE_ENV: 'development',
        PORT: '4000',
        ALLOWED_ORIGINS: 'http://127.0.0.1:4173,http://localhost:4173',
      },
    },
    {
      command: 'npm run dev --workspace frontend -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      cwd: '..',
      env: {
        ...process.env,
        VITE_API_URL: 'http://127.0.0.1:4000',
      },
    },
  ],
});
