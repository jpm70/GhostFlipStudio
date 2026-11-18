import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    acceptDownloads: true,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Servidor completo (Express + Vite) para poder probar también /api/remote-pdf.
  webServer: {
    command: 'npm run dev',
    url: `http://127.0.0.1:${PORT}/api/health`,
    env: { PORT: String(PORT), DISABLE_HMR: 'true' },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
