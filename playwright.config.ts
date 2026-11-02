import { defineConfig, devices } from '@playwright/test'

// End-to-end tests run against the production build, including the service worker.
// Set E2E_BASE_URL to test a deployed version instead, e.g. https://motion-web.pages.dev/.
const deployed = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: deployed ?? 'http://localhost:4174', trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 15'] } },
  ],
  webServer: deployed
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4174 --strictPort',
        url: 'http://localhost:4174',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
