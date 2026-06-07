import { defineConfig, devices } from "@playwright/test";

const PORT = 3001; // Running on port 3001 for complete isolation from dev server on 3000
const baseURL = `http://localhost:${PORT}`;
const testDbUrl = "postgresql://postgres:postgres@localhost:5432/codepad_test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90 * 1000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: {
    command: "npx next dev -p 3001",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      PORT: String(PORT),
      DATABASE_URL: testDbUrl,
      DIRECT_URL: testDbUrl,
      ADMIN_EMAILS: "admin@codepad.test,rvndnishad@gmail.com",
      NEXT_DIST_DIR: ".next-test",
    },
  },
});
