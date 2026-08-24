/**
 * Rasterise docs/icon.svg into the PNG sizes the README and Blender need.
 *
 *   cd web && npm run icons
 *
 * Uses the Edge already on the machine, so there is no image library to
 * install and no binary blob to trust.
 */

import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const SVG = path.join("..", "docs", "icon.svg");
const OUT = path.join("..", "docs", "images");
const SIZES = [512, 256, 128, 64, 32];

const svg = await readFile(SVG, "utf8");
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

for (const size of SIZES) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
  });
  // Transparent background so the rounded corners stay rounded.
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}
     svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  const file = path.join(OUT, `icon-${size}.png`);
  await page.screenshot({ path: file, omitBackground: true });
  console.log("  wrote", file);
  await page.close();
}

await browser.close();
