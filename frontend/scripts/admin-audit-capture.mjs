import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(process.cwd(), "audit-captures", "admin-panel");
mkdirSync(OUT_DIR, { recursive: true });
for (const sub of ["pages", "components", "states", "dialogs"]) {
  mkdirSync(join(OUT_DIR, sub), { recursive: true });
}

const BASE = "http://localhost:5173";

const VIEWPORTS = [
  { name: "small-desktop-1280", width: 1280, height: 720 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "large-desktop-2560", width: 2560, height: 1440 },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1000);
  const usernameInput = page.locator('input[placeholder="Username"]').first();
  const passwordInput = page.locator('input[placeholder="Password"]').first();
  const loginBtn = page.locator('button[type="submit"]').first();
  await usernameInput.fill("pavan");
  await passwordInput.fill("password");
  await loginBtn.click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  // ── Page-level captures at multiple viewports ──
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await login(page);

    console.log(`Capturing admin-panel at ${vp.name}…`);
    await page.goto(`${BASE}/admin-panel`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    // Move mouse away from sidebar to keep it collapsed
    await page.mouse.move(400, 300);
    await page.waitForTimeout(300);

    const vpDir = join(OUT_DIR, "pages", vp.name);
    mkdirSync(vpDir, { recursive: true });

    // Above-the-fold
    await page.screenshot({ path: join(vpDir, "above-fold.png"), fullPage: false });
    console.log(`  → above-fold.png`);

    // Full page
    await page.screenshot({ path: join(vpDir, "full-page.png"), fullPage: true });
    console.log(`  → full-page.png`);

    await context.close();
  }

  // ── Component-level captures at 1440x900 ──
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await login(page);

  await page.goto(`${BASE}/admin-panel`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.mouse.move(400, 300);
  await page.waitForTimeout(300);

  const compDir = join(OUT_DIR, "components");
  console.log("Capturing components…");

  // Header
  const header = page.locator('header, [role="banner"]').first();
  if (await header.count()) {
    await header.screenshot({ path: join(compDir, "header.png") });
    console.log("  → header.png");
  }

  // Sidebar collapsed
  const sidebar = page.locator('nav[role="navigation"]').first();
  if (await sidebar.count()) {
    await sidebar.screenshot({ path: join(compDir, "sidebar-collapsed.png") });
    console.log("  → sidebar-collapsed.png");

    // Sidebar expanded (hover)
    await sidebar.hover();
    await page.waitForTimeout(400);
    await sidebar.screenshot({ path: join(compDir, "sidebar-expanded.png") });
    console.log("  → sidebar-expanded.png");
    await page.mouse.move(400, 300);
    await page.waitForTimeout(300);
  }

  // Table
  const table = page.locator('table').first();
  if (await table.count()) {
    await table.screenshot({ path: join(compDir, "data-table.png") });
    console.log("  → data-table.png");
  }

  // Search bar area
  const searchArea = page.locator('input[type="text"]').first();
  if (await searchArea.count()) {
    await searchArea.screenshot({ path: join(compDir, "search-input.png") });
    console.log("  → search-input.png");
  }

  // Pagination
  const pagination = page.locator('.MuiTablePagination-root').first();
  if (await pagination.count()) {
    await pagination.screenshot({ path: join(compDir, "pagination.png") });
    console.log("  → pagination.png");
  }

  // ── State captures ──
  const stateDir = join(OUT_DIR, "states");
  console.log("Capturing states…");

  // Hover on first table row
  const firstRow = page.locator('table tbody tr').first();
  if (await firstRow.count()) {
    await firstRow.hover();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(stateDir, "hover-row.png"), fullPage: false });
    console.log("  → hover-row.png");
  }

  // Hover on Add User button
  const addBtn = page.locator('button:has-text("Add User")').first();
  if (await addBtn.count()) {
    await addBtn.hover();
    await page.waitForTimeout(300);
    await addBtn.screenshot({ path: join(stateDir, "hover-add-button.png") });
    console.log("  → hover-add-button.png");
  }

  // Hover on edit icon
  const editBtn = page.locator('button[aria-label="Edit user"]').first();
  if (await editBtn.count()) {
    await editBtn.hover();
    await page.waitForTimeout(300);
    await editBtn.screenshot({ path: join(stateDir, "hover-edit-icon.png") });
    console.log("  → hover-edit-icon.png");
  }

  // Hover on delete icon
  const deleteBtn = page.locator('button[aria-label="Delete user"]').first();
  if (await deleteBtn.count()) {
    await deleteBtn.hover();
    await page.waitForTimeout(300);
    await deleteBtn.screenshot({ path: join(stateDir, "hover-delete-icon.png") });
    console.log("  → hover-delete-icon.png");
  }

  // Focus state — Tab through interactive elements
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  // Click skip link first
  const skipLink = page.locator('a:has-text("Skip to content")').first();
  if (await skipLink.count()) {
    await skipLink.focus();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(stateDir, "focus-skip-link.png"), fullPage: false });
    console.log("  → focus-skip-link.png");
  }

  // Tab to first interactive element
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(stateDir, "focus-tab-1.png"), fullPage: false });
  console.log("  → focus-tab-1.png");

  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(stateDir, "focus-tab-2.png"), fullPage: false });
  console.log("  → focus-tab-2.png");

  // Search input focus
  const searchInput = page.locator('input[type="text"]').first();
  if (await searchInput.count()) {
    await searchInput.click();
    await page.waitForTimeout(300);
    await searchInput.screenshot({ path: join(stateDir, "focus-search-input.png") });
    console.log("  → focus-search-input.png");
  }

  // ── Dialog captures ──
  const dlgDir = join(OUT_DIR, "dialogs");
  console.log("Capturing dialogs…");

  // Create dialog
  if (await addBtn.count()) {
    await addBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(dlgDir, "create-dialog.png"), fullPage: false });
    console.log("  → create-dialog.png");

    // Focus state in dialog
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(dlgDir, "create-dialog-focus.png"), fullPage: false });
    console.log("  → create-dialog-focus.png");

    // Validation error state
    const createBtn = page.locator('button:has-text("Create")').first();
    if (await createBtn.count()) {
      await createBtn.click();
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(dlgDir, "create-dialog-validation.png"), fullPage: false });
      console.log("  → create-dialog-validation.png");
    }

    // Close dialog
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.count()) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // Edit dialog
  if (await editBtn.count()) {
    await editBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(dlgDir, "edit-dialog.png"), fullPage: false });
    console.log("  → edit-dialog.png");

    // Close
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.count()) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // Delete dialog
  if (await deleteBtn.count()) {
    await deleteBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(dlgDir, "delete-dialog.png"), fullPage: false });
    console.log("  → delete-dialog.png");

    // Close
    const cancelBtn = page.locator('button:has-text("Cancel")').first();
    if (await cancelBtn.count()) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // ── Coming Soon pages ──
  console.log("Capturing coming-soon pages…");
  for (const sub of ["map", "data", "events"]) {
    await page.goto(`${BASE}/admin-panel/${sub}`, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT_DIR, "pages", `coming-soon-${sub}.png`), fullPage: false });
    console.log(`  → coming-soon-${sub}.png`);
  }

  // ── Keyboard nav through sidebar ──
  await page.goto(`${BASE}/admin-panel`, { waitUntil: "networkidle", timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.mouse.move(400, 300);
  await page.waitForTimeout(300);

  // Tab to sidebar items
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: join(stateDir, "keyboard-nav-sidebar.png"), fullPage: false });
  console.log("  → keyboard-nav-sidebar.png");

  await browser.close();
  console.log(`\nAll screenshots saved to ${OUT_DIR}/`);
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
