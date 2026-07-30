import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: externalBaseUrl ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(externalBaseUrl === undefined
    ? {
        webServer: {
          command:
            "bun --env-file=../../.env.local run --cwd apps/web dev -- -p 3100",
          url: "http://127.0.0.1:3100",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }
    : {}),
});
