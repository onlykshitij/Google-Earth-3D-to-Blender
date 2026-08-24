/**
 * Capture the README screenshots.
 *
 *   python tools/demo_hub.py            # in one terminal
 *   cd web && npm run screenshots       # in another
 *
 * Uses the Edge already installed on the machine rather than downloading a
 * browser. Pass --url to point at a different hub.
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
};

const URL = arg("url", "http://127.0.0.1:8788/");
// Default output is the repo's docs folder, one level up from web/.
const OUT = arg("out", path.join("..", "docs", "images"));
const VIEWPORT = { width: 1600, height: 950 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ channel: "msedge" });
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1.5, // crisp enough without huge files
    colorScheme: "dark",
  });

  const shot = async (name) => {
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    console.log("  wrote", file);
    return file;
  };

  console.log("loading", URL);
  await page.goto(URL, { waitUntil: "networkidle" });

  // Wait for the basemap to actually be there, or the shots look broken.
  await page.waitForSelector("img.leaflet-tile-loaded", { timeout: 20000 });
  await sleep(1500);

  // --- 1. searching by coordinates ----------------------------------------
  const search = page.locator('input[placeholder*="Google Maps"]');
  await search.click();
  await search.type("43.72313, 10.39643", { delay: 25 });
  await sleep(700);
  await shot("01-search");

  await search.press("Enter");
  await sleep(3200); // the fly-to animation plus tile loading
  await page.waitForSelector("img.leaflet-tile-loaded");

  // Clear the field so its confirmation row stops covering the map, and switch
  // to imagery so the area being selected is actually recognisable.
  await search.fill("");
  await page.locator("button", { hasText: "Satellite" }).click();
  await sleep(3500);
  await sleep(1200);

  // --- 2. drag out an area -------------------------------------------------
  // Real mouse events, so Leaflet's own handlers do the work.
  const box = await page.locator(".leaflet-container").boundingBox();
  const from = { x: box.x + 430, y: box.y + 300 };
  const to = { x: box.x + 700, y: box.y + 540 };

  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 120, from.y + 100, { steps: 12 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
  await sleep(1200);
  await shot("02-area-selected");

  // --- 3. choosing which Blender to export to -----------------------------
  const picker = page.locator("button", { hasText: /\.blend/ }).first();
  await picker.click();
  await sleep(600);
  await shot("03-choose-blender");

  // --- 4. a finished export ------------------------------------------------
  const finished = page.locator("button", { hasText: "harbour.blend" }).last();
  await finished.click();
  await sleep(1800);
  await shot("04-import-finished");

  // --- 5. picking an export folder on the Blender machine ------------------
  const files = page.locator("button", { hasText: "Browse" }).first();
  await files.scrollIntoViewIfNeeded();
  await files.click();
  await page.waitForSelector("text=Choose an export folder", { timeout: 8000 });
  await sleep(1600);
  await shot("05-folder-picker");
  await page.keyboard.press("Escape");
  await sleep(400);

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
