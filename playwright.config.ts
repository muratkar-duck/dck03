import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60_000,
  use: { baseURL: process.env.BASE_URL || 'https://dck03.vercel.app' },
});
