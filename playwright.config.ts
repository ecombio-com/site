import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL:
      process.env.E2E_BASE_URL ??
      (isCI ? `http://localhost:${PORT}` : 'https://website.localhost'),
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer:
    isCI && !process.env.E2E_BASE_URL
      ? {
          command: `pnpm --dir apps/web run preview --host 127.0.0.1 --port ${PORT} --strictPort`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: false,
          timeout: 180_000,
        }
      : undefined,
});
