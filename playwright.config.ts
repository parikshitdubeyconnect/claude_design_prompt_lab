import { defineConfig, devices } from "@playwright/test";

// Chromium is pre-installed in this environment; point at it directly so the
// runner never tries to download a browser. Use the headless-shell build —
// this Chromium dropped the legacy `--headless=old` mode Playwright 1.48 uses.
const CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const PORT = process.env.PL_PORT || "3100";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    launchOptions: {
      executablePath: CHROME,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } },
    },
  ],
});
