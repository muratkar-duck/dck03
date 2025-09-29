import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';

const envFiles = ['.env.e2e', '.env.local', '.env'];
for (const file of envFiles) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, override: false });
  }
}

process.env.NEXT_PUBLIC_E2E_TEST_MODE =
  process.env.NEXT_PUBLIC_E2E_TEST_MODE ?? 'true';
process.env.NEXT_PUBLIC_E2E_WRITER_EMAIL =
  process.env.NEXT_PUBLIC_E2E_WRITER_EMAIL ?? 'writer@ducktylo.test';
process.env.NEXT_PUBLIC_E2E_PRODUCER_EMAIL =
  process.env.NEXT_PUBLIC_E2E_PRODUCER_EMAIL ?? 'producer@ducktylo.test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 2 : 0,
  fullyParallel: false,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 0.0.0.0 --port 3000',
    url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
