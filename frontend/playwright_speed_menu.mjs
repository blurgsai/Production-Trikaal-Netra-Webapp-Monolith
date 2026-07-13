import { chromium } from "@playwright/test";

const BASE = "http://localhost:5173";
const SCREENSHOT_DIR = "./playwright-screenshots";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.route("**/users/auth", (route) => {
    route.fulfill({ status: 200, body: JSON.stringify({ valid: true }) });
  });

  await context.route("**/vessels/trajectory", (route) => {
    const body = {
      trajectories: {
        V0001: [
          { ts: "2024-12-04T10:35:00Z", lat: 15.0, lon: 65.5, heading: 45, speed: 10 },
          { ts: "2024-12-05T10:35:00Z", lat: 15.1, lon: 65.6, heading: 50, speed: 11 },
          { ts: "2024-12-06T10:35:00Z", lat: 15.2, lon: 65.7, heading: 55, speed: 12 },
          { ts: "2024-12-07T10:35:00Z", lat: 15.3, lon: 65.8, heading: 60, speed: 10 },
        ],
      },
      timestamps: [
        "2024-12-04T10:35:00Z",
        "2024-12-05T10:35:00Z",
        "2024-12-06T10:35:00Z",
        "2024-12-07T10:35:00Z",
      ],
    };
    route.fulfill({ status: 200, body: JSON.stringify(body) });
  });

  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("token", "fake-test-token");
    localStorage.setItem("role", "admin");
    localStorage.setItem("user_id", "test-user");
    localStorage.setItem("username", "TestUser");
  });

  await page.goto(`${BASE}/historical-playback`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Draw polygon
  const drawButton = page.locator("text=Click to draw area");
  if (await drawButton.isVisible()) {
    await drawButton.click();
    await page.waitForTimeout(1000);
  }

  const canvas = page.locator(".leaflet-container").first();
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx - 150, cy - 100);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 150, cy - 100);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 150, cy + 100);
    await page.waitForTimeout(300);
    await page.mouse.click(cx - 150, cy + 100);
    await page.waitForTimeout(300);
    await page.mouse.click(cx - 150, cy - 100);
    await page.waitForTimeout(2000);
  }

  // Click Play in dialog
  const playButton = page.locator('button:has-text("Play")');
  if (await playButton.isVisible()) {
    await playButton.click();
    await page.waitForTimeout(2000);
  }

  // Open speed menu
  const speedButton = page.locator('button:has-text("x")').first();
  if (await speedButton.isVisible()) {
    await speedButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-speed-menu.png`, fullPage: false });
    console.log("Captured: 09-speed-menu.png");

    // Try clicking 2x - should work now with disablePortal
    const speed2x = page.locator('[role="menuitem"]:has-text("2x")');
    if (await speed2x.isVisible()) {
      await speed2x.click({ timeout: 5000 }).catch((e) => console.log("Click failed:", e.message));
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/10-speed-2x.png`, fullPage: false });
      console.log("Captured: 10-speed-2x.png");
    }
  }

  await browser.close();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
