import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(process.cwd(), "screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "http://localhost:5173";

const PAGES = [
  { name: "user-management", path: "/admin-panel" },
  { name: "map-management", path: "/admin-panel/map" },
  { name: "data-management", path: "/admin-panel/data" },
  { name: "events-management", path: "/admin-panel/events" },
];

const VIEWPORTS = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 375, height: 812 },
];

async function login(page) {
  console.log("Logging in…");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);

  // Fill login form
  const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  const loginBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in")').first();

  await usernameInput.fill("pavan");
  await passwordInput.fill("password");
  await loginBtn.click();

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log("Logged in successfully.");
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // Login once in a desktop context, save storage state
  const setupContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const setupPage = await setupContext.newPage();
  await login(setupPage);
  const storageState = await setupContext.storageState();
  await setupContext.close();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      storageState,
    });
    const page = await context.newPage();

    for (const p of PAGES) {
      const url = `${BASE}${p.path}`;
      console.log(`Capturing ${p.name} @ ${vp.label} (${vp.width}x${vp.height})…`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);
      const filename = `${p.name}-${vp.label}.png`;
      await page.screenshot({ path: join(OUT_DIR, filename), fullPage: false });
      console.log(`  → ${filename}`);
    }

    // Dialogs — desktop only
    if (vp.label === "desktop") {
      // Create dialog
      console.log("Capturing create-user dialog @ desktop…");
      await page.goto(`${BASE}/admin-panel`, { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);
      const addBtn = page.getByText("Add User", { exact: false }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: join(OUT_DIR, "create-dialog-desktop.png"), fullPage: false });
        console.log("  → create-dialog-desktop.png");
      }

      // Edit dialog
      console.log("Capturing edit-user dialog @ desktop…");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const editBtn = page.getByLabel("Edit user").first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: join(OUT_DIR, "edit-dialog-desktop.png"), fullPage: false });
        console.log("  → edit-dialog-desktop.png");
      }

      // Delete dialog
      console.log("Capturing delete-user dialog @ desktop…");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const deleteBtn = page.getByLabel("Delete user").first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: join(OUT_DIR, "delete-dialog-desktop.png"), fullPage: false });
        console.log("  → delete-dialog-desktop.png");
      }
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}/`);
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
