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

  const allConsole = [];
  const mvtRequests = [];

  page.on("console", (msg) => {
    const text = msg.text();
    allConsole.push(`[${msg.type()}] ${text}`);
    if (text.includes("MvtOverlay") || text.includes("MapOverlays")) {
      console.log(`CONSOLE: ${text}`);
    }
  });
  page.on("request", (req) => {
    if (req.url().includes(".pbf") || req.url().includes("/mvt/")) {
      mvtRequests.push(req.url().substring(0, 300));
      console.log(`MVT REQ: ${req.url().substring(0, 200)}`);
    }
  });
  page.on("response", (resp) => {
    if (resp.url().includes(".pbf") || resp.url().includes("/mvt/")) {
      console.log(`MVT RESP: ${resp.status()} size=${resp.headers()['content-length'] || '?'}`);
    }
  });

  await login(page);

  console.log("Navigating to map page…");
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(5000);

  // Zoom to US East Coast
  console.log("Zooming to US East Coast…");
  await page.evaluate(() => {
    // Find Leaflet map instance
    const container = document.querySelector('.leaflet-container');
    if (!container) return "no container";
    // Try to get map from window.L
    if (window.L && window.L.Map) {
      // Leaflet stores maps in a global
      for (const key in window) {
        if (window[key] instanceof window.L.Map) {
          window[key].setView([40, -71], 5);
          return "found via window";
        }
      }
    }
    // Try via _leaflet_id on container
    const id = container._leaflet_id;
    if (id !== undefined && window.L) {
      const map = window.L.Map._instances?.[0];
      if (map) {
        map.setView([40, -71], 5);
        return "found via _instances";
      }
    }
    return "map not found";
  });
  await page.waitForTimeout(8000);

  // Screenshot
  await page.screenshot({ path: join(OUT_DIR, "debug-enc-final2.png"), fullPage: false });
  console.log("Screenshot saved");

  // Print all console logs
  console.log("\n=== ALL CONSOLE LOGS ===");
  for (const l of allConsole) console.log(l);

  console.log(`\n=== MVT REQUESTS: ${mvtRequests.length} ===`);
  for (const r of mvtRequests) console.log(`  ${r}`);

  await browser.close();
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
