import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(process.cwd(), "screenshots", "navrail");
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "http://localhost:5173";

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();
  await usernameInput.fill("pavan");
  await passwordInput.fill("password");
  await loginBtn.click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await login(page);

  // 1. Main app sidebar — collapsed (default state)
  console.log("Capturing main sidebar collapsed…");
  await page.goto(`${BASE}/map`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.mouse.move(400, 300); // move mouse away from sidebar
  await page.waitForTimeout(300);
  const mainNav = page.locator('nav[role="navigation"]').first();
  await mainNav.screenshot({ path: join(OUT_DIR, "main-collapsed.png") });
  console.log("  → main-collapsed.png");

  // 2. Main app sidebar — expanded (hover state)
  console.log("Capturing main sidebar expanded (hover)…");
  await mainNav.hover();
  await page.waitForTimeout(300);
  await mainNav.screenshot({ path: join(OUT_DIR, "main-expanded.png") });
  console.log("  → main-expanded.png");

  // 3. Admin sidebar — collapsed
  console.log("Capturing admin sidebar collapsed…");
  await page.goto(`${BASE}/admin-panel`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.mouse.move(400, 300); // move mouse away from sidebar
  await page.waitForTimeout(300);
  const adminNav = page.locator('nav[role="navigation"]').first();
  await adminNav.screenshot({ path: join(OUT_DIR, "admin-collapsed.png") });
  console.log("  → admin-collapsed.png");

  // 4. Admin sidebar — expanded (hover state)
  console.log("Capturing admin sidebar expanded (hover)…");
  await adminNav.hover();
  await page.waitForTimeout(300);
  await adminNav.screenshot({ path: join(OUT_DIR, "admin-expanded.png") });
  console.log("  → admin-expanded.png");

  // 5. Full page — main app with collapsed sidebar
  console.log("Capturing main app full page…");
  await page.goto(`${BASE}/map`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT_DIR, "main-page-collapsed.png"), fullPage: false });
  console.log("  → main-page-collapsed.png");

  // 6. Full page — admin with collapsed sidebar
  console.log("Capturing admin page full…");
  await page.goto(`${BASE}/admin-panel`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT_DIR, "admin-page-collapsed.png"), fullPage: false });
  console.log("  → admin-page-collapsed.png");

  // 7. Focus state on nav items
  console.log("Capturing focus state…");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT_DIR, "focus-state.png"), fullPage: false });
  console.log("  → focus-state.png");

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}/`);
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
