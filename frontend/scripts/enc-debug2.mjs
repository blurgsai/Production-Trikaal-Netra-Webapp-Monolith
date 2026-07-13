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

  const consoleErrors = [];
  const networkErrors = [];
  const mvtRequests = [];
  const mvtResponses = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.includes(".pbf") || url.includes("mvt")) {
      networkErrors.push(`${url.substring(0, 200)} - ${req.failure()?.errorText}`);
    }
  });
  page.on("request", (req) => {
    if (req.url().includes(".pbf") || req.url().includes("/mvt/")) {
      mvtRequests.push(req.url().substring(0, 250));
    }
  });
  page.on("response", (resp) => {
    if (resp.url().includes(".pbf") || resp.url().includes("/mvt/")) {
      mvtResponses.push(`HTTP ${resp.status()} ${resp.url().substring(0, 200)}`);
    }
  });

  await login(page);

  console.log("Navigating to map page…");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(3000);

  // Zoom to US East Coast using Leaflet's global L object
  console.log("Zooming to US East Coast (lat=40, lon=-71, z=5)…");
  await page.evaluate(() => {
    // Try multiple ways to get the Leaflet map instance
    const container = document.querySelector('.leaflet-container');
    if (!container) {
      console.log("No leaflet container found");
      return;
    }
    // Access the map via the container's _leaflet_id
    const mapId = container._leaflet_id;
    const map = window.L?.Map?._instances?.[0] || (window.L?.map?._instances?.[0]);
    if (map) {
      map.setView([40, -71], 5);
      console.log("Map view set via L.Map._instances");
    } else {
      // Try to find via DOM
      const keys = Object.keys(container).filter(k => k.startsWith('_leaflet'));
      console.log("Leaflet keys on container:", keys);
    }
  });
  await page.waitForTimeout(5000);

  // Screenshot 1: Zoomed to ENC area
  console.log("Capturing zoomed view…");
  await page.screenshot({ path: join(OUT_DIR, "debug-enc-zoomed2.png"), fullPage: false });

  // Wait more for tile requests
  await page.waitForTimeout(5000);

  // Screenshot 2: After waiting for tiles
  console.log("Capturing final view…");
  await page.screenshot({ path: join(OUT_DIR, "debug-enc-final.png"), fullPage: false });

  // Print diagnostics
  console.log("\n=== DIAGNOSTICS ===");
  console.log(`Console errors: ${consoleErrors.length}`);
  for (const e of consoleErrors) console.log(`  ERROR: ${e}`);
  console.log(`MVT requests: ${mvtRequests.length}`);
  for (const r of mvtRequests) console.log(`  REQ: ${r}`);
  console.log(`MVT responses: ${mvtResponses.length}`);
  for (const r of mvtResponses) console.log(`  RESP: ${r}`);
  console.log(`MVT network errors: ${networkErrors.length}`);
  for (const e of networkErrors) console.log(`  FAILED: ${e}`);

  // Also check what VITE_TILESERVER_URL is
  const envUrl = await page.evaluate(() => {
    return (window).__env__?.VITE_TILESERVER_URL || "not found";
  });
  console.log(`\nVITE_TILESERVER_URL: ${envUrl}`);

  // Check the overlay data from the API
  const tileserverUrl = await page.evaluate(() => {
    return import.meta?.env?.VITE_TILESERVER_URL || "not found";
  });
  console.log(`import.meta.env.VITE_TILESERVER_URL: ${tileserverUrl}`);

  await browser.close();
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
