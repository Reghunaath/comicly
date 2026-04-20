import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      // Disable mock API so page.route() can intercept real fetch calls
      NEXT_PUBLIC_USE_MOCK_API: "false",
      // Dummy Supabase values so createBrowserClient doesn't throw;
      // getUser() returns null (no session) without making HTTP requests.
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-dummy-anon-key",
      NEXT_PUBLIC_BASE_URL: "http://localhost:3000",
    },
  },
});
