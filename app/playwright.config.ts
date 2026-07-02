import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5183/project-cockpit/',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm run dev -- --port 5183 --strictPort',
    url: 'http://localhost:5183/project-cockpit/',
    reuseExistingServer: true,
    timeout: 60000,
  },
  reporter: [['list']],
  retries: 1,
  workers: 1,
})
