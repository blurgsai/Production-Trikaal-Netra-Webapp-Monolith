import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(process.cwd(), "screenshots");
mkdirSync(OUT_DIR, { recursive: true });

const BASE = "http://localhost:5173";

async function login(page) {
  console.log("Logging in…");
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
  console.log("Logged in successfully.");
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // Capture console errors and network failures
  const consoleErrors = [];
  const networkErrors = [];
  const mvtRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("requestfailed", (req) => {
    networkErrors.push(`${req.url()} - ${req.failure()?.errorText}`);
  });
  page.on("request", (req) => {
    if (req.url().includes(".pbf") || req.url().includes("mvt")) {
      mvtRequests.push(req.url());
    }
  });
  page.on("response", (resp) => {
    if (resp.url().includes(".pbf") || resp.url().includes("mvt")) {
      console.log(`MVT RESPONSE: ${resp.status()} ${resp.url().substring(0, 150)}`);
    }
  });

  await login(page);

  console.log("Navigating to map page…");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(3000);

  // Open layer panel
  console.log("Opening layer panel…");
  const layersBtn = page.locator('button').filter({ has: page.locator('svg[data-testid="LayersOutlinedIcon"]') }).first();
  if (await layersBtn.isVisible()) {
    await layersBtn.click();
    await page.waitForTimeout(1000);
    console.log("Layer panel opened");
  } else {
    console.log("Layer button not found, trying alternative…");
    const btns = page.locator('button');
    const count = await btns.count();
    for (let i = 0; i < count; i++) {
      const tooltip = await btns.nth(i).getAttribute('aria-label');
      const title = await btns.nth(i).getAttribute('title');
      if (tooltip?.includes('Map Config') || title?.includes('Map Config') || tooltip?.includes('layer') || title?.includes('layer')) {
        await btns.nth(i).click();
        await page.waitForTimeout(1000);
        console.log(`Clicked button ${i}: tooltip=${tooltip}, title=${title}`);
        break;
      }
    }
  }

  // Screenshot layer panel
  await page.screenshot({ path: join(OUT_DIR, "debug-layer-panel.png"), fullPage: false });

  // Find and click the ENC toggle
  console.log("Looking for ENC overlay switch…");
  const encLabel = page.locator('span:has-text("US2EC03M"), label:has-text("US2EC03M"), *:has-text("US2EC03M")').first();
  if (await encLabel.isVisible()) {
    console.log("Found ENC label, clicking…");
    // Find the parent switch/label element
    const switchEl = encLabel.locator('xpath=ancestor::*[contains(@class, "MuiFormControlLabel") or contains(@class, "MuiButtonBase")]/descendant::input[@type="checkbox"]').first();
    if (await switchEl.isVisible()) {
      await switchEl.click();
    } else {
      // Just click the text element
      await encLabel.click();
    }
    await page.waitForTimeout(3000);
    console.log("ENC toggle clicked");
  } else {
    console.log("ENC label not found. Listing all text in layer panel…");
    const layerPanel = page.locator('.MuiBox-root').filter({ hasText: 'Overlay Layers' }).first();
    if (await layerPanel.isVisible()) {
      const allText = await layerPanel.innerText();
      console.log(`Layer panel text:\n${allText}`);
    }
  }

  // Screenshot with ENC toggled
  await page.screenshot({ path: join(OUT_DIR, "debug-enc-toggled.png"), fullPage: false });

  // Try to zoom to US East Coast
  console.log("Zooming to US East Coast…");
  await page.evaluate(() => {
    const container = document.querySelector('.leaflet-container');
    if (container && container._leaflet_id !== undefined) {
      const map = (window).L?.Map?._instances?.[0];
      // Try to find the map instance
      const mapEl = document.querySelector('.leaflet-container');
      if (mapEl && mapEl._leaflet_map) {
        mapEl._leaflet_map.setView([40, -71], 5);
      }
    }
  });
  await page.waitForTimeout(5000);

  // Final screenshot
  await page.screenshot({ path: join(OUT_DIR, "debug-enc-zoomed.png"), fullPage: false });

  // Print diagnostics
  console.log("\n=== DIAGNOSTICS ===");
  console.log(`Console errors: ${consoleErrors.length}`);
  for (const e of consoleErrors) console.log(`  ERROR: ${e}`);
  console.log(`Network errors: ${networkErrors.length}`);
  for (const e of networkErrors) console.log(`  FAILED: ${e}`);
  console.log(`MVT requests: ${mvtRequests.length}`);
  for (const r of mvtRequests) console.log(`  REQUEST: ${r.substring(0, 200)}`);

  await browser.close();
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
