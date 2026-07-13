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

  // Login
  await login(page);

  // Go to map page
  console.log("Navigating to map page…");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(3000);

  // Screenshot 1: Initial map view
  console.log("Capturing initial map view…");
  await page.screenshot({ path: join(OUT_DIR, "map-initial.png"), fullPage: false });
  console.log("  → map-initial.png");

  // Open the layer panel (layers icon in top-right toolbar)
  console.log("Opening layer panel…");
  const layersBtn = page.locator('button:has(svg[data-testid="LayersOutlinedIcon"]), button[title="Map Config"]').first();
  if (await layersBtn.isVisible()) {
    await layersBtn.click();
    await page.waitForTimeout(1000);
  } else {
    // Try by tooltip/aria
    const btn = page.locator('button').filter({ hasText: /layers/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Screenshot 2: Layer panel open
  console.log("Capturing layer panel…");
  await page.screenshot({ path: join(OUT_DIR, "map-layer-panel.png"), fullPage: false });
  console.log("  → map-layer-panel.png");

  // Look for the ENC overlay toggle and enable it
  console.log("Looking for ENC overlay toggle…");
  const encToggle = page.locator('label:has-text("ENC"), label:has-text("US2EC"), span:has-text("ENC")').first();
  if (await encToggle.isVisible()) {
    console.log("Found ENC toggle, clicking…");
    await encToggle.click();
    await page.waitForTimeout(2000);
  } else {
    console.log("ENC toggle not found, trying all switches in overlay section…");
    // Try clicking all switches in the overlay layers section
    const switches = page.locator('input[type="checkbox"]');
    const count = await switches.count();
    console.log(`Found ${count} switches`);
    for (let i = 0; i < count; i++) {
      const sw = switches.nth(i);
      const isChecked = await sw.isChecked();
      if (!isChecked) {
        await sw.click();
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(2000);
  }

  // Screenshot 3: With ENC enabled
  console.log("Capturing map with overlays enabled…");
  await page.screenshot({ path: join(OUT_DIR, "map-enc-enabled.png"), fullPage: false });
  console.log("  → map-enc-enabled.png");

  // Try to zoom to US East Coast area where ENC data is
  console.log("Zooming to US East Coast (ENC data area)…");
  // Pan/zoom via evaluating Leaflet map
  await page.evaluate(() => {
    const map = window.L?.Map?._instances?.[0] || document.querySelector('.leaflet-container')?._leaflet_map;
    if (map) {
      map.setView([40, -71], 5);
    }
  });
  await page.waitForTimeout(3000);

  // Screenshot 4: Zoomed to ENC area
  console.log("Capturing zoomed ENC area…");
  await page.screenshot({ path: join(OUT_DIR, "map-enc-zoomed.png"), fullPage: false });
  console.log("  → map-enc-zoomed.png");

  // Also capture admin map management page
  console.log("Navigating to admin map management…");
  await page.goto(`${BASE}/admin-panel/map`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click Overlay Layers tab
  const overlayTab = page.locator('button:has-text("Overlay Layers"), [role="tab"]:has-text("Overlay")').first();
  if (await overlayTab.isVisible()) {
    await overlayTab.click();
    await page.waitForTimeout(1000);
  }

  console.log("Capturing admin overlay management…");
  await page.screenshot({ path: join(OUT_DIR, "admin-overlays.png"), fullPage: false });
  console.log("  → admin-overlays.png");

  // Capture console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`CONSOLE ERROR: ${msg.text()}`);
    }
  });
  page.on("requestfailed", (req) => {
    console.log(`REQUEST FAILED: ${req.url()} - ${req.failure()?.errorText}`);
  });

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}/`);
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
