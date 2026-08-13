import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'landing-desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4173',
        ...(process.env.CI ? {} : { channel: 'msedge' as const }),
      },
    },
    {
      name: 'landing-mobile',
      use: {
        ...devices['Pixel 7'],
        baseURL: 'http://127.0.0.1:4173',
        ...(process.env.CI ? {} : { channel: 'msedge' as const }),
      },
    },
    {
      name: 'web-desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4174',
        ...(process.env.CI ? {} : { channel: 'msedge' as const }),
      },
    },
    {
      name: 'web-mobile',
      use: {
        ...devices['Pixel 7'],
        baseURL: 'http://127.0.0.1:4174',
        ...(process.env.CI ? {} : { channel: 'msedge' as const }),
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev -w @qr/landing -- --host 127.0.0.1 --port 4173',
      port: 4173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -w @qr/web -- --host 127.0.0.1 --port 4174',
      port: 4174,
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: 'http://127.0.0.1:4000/api/v1' },
    },
  ],
});
