import { chromium } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// Render docs/key-takeaways.html → public/key-takeaways.pdf using the
// environment's pre-installed Chromium headless-shell.
const CHROME = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
const src = pathToFileURL(resolve("docs/key-takeaways.html")).href;
const out = resolve("public/key-takeaways.pdf");

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto(src, { waitUntil: "networkidle" });
await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("wrote", out);
