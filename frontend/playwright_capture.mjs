import { chromium } from "@playwright/test";

const BASE = "http://localhost:5173";
const SCREENSHOT_DIR = "./playwright-screenshots";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Intercept auth check so we don't get logged out
  await context.route("**/users/auth", (route) => {
    route.fulfill({ status: 200, body: JSON.stringify({ valid: true }) });
  });

  // Intercept trajectory API so we get mock data without backend
  await context.route("**/vessels/trajectory", (route) => {
    const body = {
      trajectories: {
        V0001: [
          { ts: "2024-12-04T10:35:00Z", lat: 15.0, lon: 65.5, heading: 45, speed: 10 },
          { ts: "2024-12-05T10:35:00Z", lat: 15.1, lon: 65.6, heading: 50, speed: 11 },
          { ts: "2024-12-06T10:35:00Z", lat: 15.2, lon: 65.7, heading: 55, speed: 12 },
          { ts: "2024-12-07T10:35:00Z", lat: 15.3, lon: 65.8, heading: 60, speed: 10 },
          { ts: "2024-12-08T10:35:00Z", lat: 15.4, lon: 65.9, heading: 65, speed: 9 },
          { ts: "2024-12-09T10:35:00Z", lat: 15.5, lon: 66.0, heading: 70, speed: 8 },
          { ts: "2024-12-10T10:35:00Z", lat: 15.6, lon: 66.1, heading: 75, speed: 7 },
          { ts: "2024-12-11T10:35:00Z", lat: 15.7, lon: 66.2, heading: 80, speed: 6 },
        ],
        V0002: [
          { ts: "2024-12-04T10:35:00Z", lat: 14.5, lon: 66.0, heading: 90, speed: 5 },
          { ts: "2024-12-05T10:35:00Z", lat: 14.6, lon: 66.1, heading: 95, speed: 6 },
          { ts: "2024-12-06T10:35:00Z", lat: 14.7, lon: 66.2, heading: 100, speed: 7 },
          { ts: "2024-12-07T10:35:00Z", lat: 14.8, lon: 66.3, heading: 105, speed: 8 },
          { ts: "2024-12-08T10:35:00Z", lat: 14.9, lon: 66.4, heading: 110, speed: 9 },
          { ts: "2024-12-09T10:35:00Z", lat: 15.0, lon: 66.5, heading: 115, speed: 10 },
          { ts: "2024-12-10T10:35:00Z", lat: 15.1, lon: 66.6, heading: 120, speed: 11 },
          { ts: "2024-12-11T10:35:00Z", lat: 15.2, lon: 66.7, heading: 125, speed: 12 },
        ],
      },
      timestamps: [
        "2024-12-04T10:35:00Z",
        "2024-12-05T10:35:00Z",
        "2024-12-06T10:35:00Z",
        "2024-12-07T10:35:00Z",
        "2024-12-08T10:35:00Z",
        "2024-12-09T10:35:00Z",
        "2024-12-10T10:35:00Z",
        "2024-12-11T10:35:00Z",
      ],
    };
    route.fulfill({ status: 200, body: JSON.stringify(body) });
  });

  const page = await context.newPage();

  // Set fake auth in localStorage before navigating
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.setItem("token", "fake-test-token");
    localStorage.setItem("role", "admin");
    localStorage.setItem("user_id", "test-user");
    localStorage.setItem("username", "TestUser");
  });

  // Navigate to historical playback
  await page.goto(`${BASE}/historical-playback`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-onboarding.png`, fullPage: false });
  console.log("Captured: 01-onboarding.png");

  // Click "Click to draw area" to activate polygon drawing
  const drawButton = page.locator("text=Click to draw area");
  if (await drawButton.isVisible()) {
    await drawButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-drawing-mode.png`, fullPage: false });
    console.log("Captured: 02-drawing-mode.png");
  }

  // Draw a polygon by clicking several points on the map
  const canvas = page.locator(".leaflet-container").first();
  const box = await canvas.boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    // Click 4 corners to form a polygon
    await page.mouse.click(cx - 150, cy - 100);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 150, cy - 100);
    await page.waitForTimeout(300);
    await page.mouse.click(cx + 150, cy + 100);
    await page.waitForTimeout(300);
    await page.mouse.click(cx - 150, cy + 100);
    await page.waitForTimeout(300);
    // Click first point again to close polygon
    await page.mouse.click(cx - 150, cy - 100);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-polygon-drawn.png`, fullPage: false });
    console.log("Captured: 03-polygon-drawn.png");
  }

  // The PlaybackDialog should now be open
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/04-playback-dialog.png`, fullPage: false });
  console.log("Captured: 04-playback-dialog.png");

  // Click the Play button in the dialog
  const playButton = page.locator('button:has-text("Play")');
  if (await playButton.isVisible()) {
    await playButton.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-playback-playing.png`, fullPage: false });
    console.log("Captured: 05-playback-playing.png");
  }

  // Wait a bit more for animation
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/06-playback-mid.png`, fullPage: false });
  console.log("Captured: 06-playback-mid.png");

  // Click pause button using force to bypass overlay
  const pauseButton = page.locator('[data-testid="PauseIcon"]').first();
  if (await pauseButton.isVisible().catch(() => false)) {
    await pauseButton.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-playback-paused.png`, fullPage: false });
    console.log("Captured: 07-playback-paused.png");
  } else {
    // Playback may have finished, restart it
    const playArrow2 = page.locator('[data-testid="PlayArrowIcon"]').first();
    if (await playArrow2.isVisible().catch(() => false)) {
      await playArrow2.click({ force: true }).catch(() => {});
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/07-playback-paused.png`, fullPage: false });
      console.log("Captured: 07-playback-paused.png (restart)");
    }
  }

  // Click play again
  const playArrow = page.locator('[data-testid="PlayArrowIcon"]').first();
  if (await playArrow.isVisible().catch(() => false)) {
    await playArrow.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-playback-resumed.png`, fullPage: false });
    console.log("Captured: 08-playback-resumed.png");
  }

  // Click speed dropdown
  const speedButton = page.locator('button:has-text("x")').first();
  if (await speedButton.isVisible()) {
    await speedButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-speed-menu.png`, fullPage: false });
    console.log("Captured: 09-speed-menu.png");

    // Click 2x speed using force to bypass overlay
    const speed2x = page.locator('[role="menuitem"]:has-text("2x")');
    if (await speed2x.isVisible()) {
      await speed2x.click({ force: true });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/10-speed-2x.png`, fullPage: false });
      console.log("Captured: 10-speed-2x.png");
    }
  }

  // Drag slider to a position
  const slider = page.locator('[role="slider"]').first();
  if (await slider.isVisible().catch(() => false)) {
    const sliderBox = await slider.boundingBox();
    if (sliderBox) {
      // Click at 25% position using force
      await page.mouse.click(
        sliderBox.x + sliderBox.width * 0.25,
        sliderBox.y + sliderBox.height / 2,
      );
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11-slider-seeked.png`, fullPage: false });
      console.log("Captured: 11-slider-seeked.png");
    }
  } else {
    console.log("Skipped: 11-slider-seeked.png (slider not visible)");
  }

  // Final screenshot after waiting
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/12-final-state.png`, fullPage: false });
  console.log("Captured: 12-final-state.png");

  await browser.close();
  console.log("Done! Screenshots saved to ./playwright-screenshots/");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
