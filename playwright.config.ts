import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.mjs',
  testIgnore: process.env.RUN_REAL_E2E ? [] : ['real/**'],
  timeout: 30_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: process.env.PWVIDEO ? 'retain-on-failure' : 'off'
  }
});
