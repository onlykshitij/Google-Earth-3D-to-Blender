/**
 * Checks for the map settings: which value wins, and how search addresses are
 * built.
 *
 *   cd web && npx esbuild src/lib/settings.check.ts --bundle --platform=node \
 *       --outfile=../dist/settings.check.cjs && node ../dist/settings.check.cjs
 */

import { clean, DEFAULT_GEOCODER, effective, geocodeUrl } from "./settings";

let failures = 0;

function expect(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`[${ok ? "ok  " : "FAIL"}] ${label.padEnd(46)} -> ${JSON.stringify(got)}`);
}

// --- which value wins ---------------------------------------------------
const hub = { cartoKey: "hub-key", geocoderUrl: "https://hub.example/?q={query}" };

expect("hub values apply when the browser has none", effective(hub, {}), {
  cartoKey: "hub-key",
  tileUrl: "",
  tileAttribution: "",
  geocoderUrl: "https://hub.example/?q={query}",
});
expect(
  "a browser value beats the hub's",
  effective(hub, { cartoKey: "mine" }).cartoKey,
  "mine",
);
expect(
  "an older hub without settings is fine",
  effective(undefined, { tileUrl: "https://t/{z}/{x}/{y}.png" }).tileUrl,
  "https://t/{z}/{x}/{y}.png",
);
expect(
  "blank and unknown values are dropped",
  clean({ cartoKey: "  ", tileUrl: " x ", other: "y", geocoderUrl: 3 }),
  { tileUrl: "x" },
);
expect("junk is treated as nothing", clean("not an object"), {});

// --- search addresses ---------------------------------------------------
expect(
  "an empty template uses public Nominatim",
  geocodeUrl("", "Pisa tower"),
  DEFAULT_GEOCODER.replace("{query}", "Pisa%20tower"),
);
expect(
  "{query} is replaced and encoded",
  geocodeUrl("https://geo.example/search?key=K&q={query}", "a&b=c"),
  "https://geo.example/search?key=K&q=a%26b%3Dc",
);
expect(
  "no {query}: appended as q= after existing params",
  geocodeUrl("https://geo.example/search?format=json", "Pisa"),
  "https://geo.example/search?format=json&q=Pisa",
);
expect(
  "no {query} and no params: appended with ?",
  geocodeUrl("https://geo.example/search", "Pisa"),
  "https://geo.example/search?q=Pisa",
);

console.log("\n" + "=".repeat(62));
console.log(failures ? `${failures} FAILED` : "ALL CHECKS PASSED");
console.log("=".repeat(62));
process.exit(failures ? 1 : 0);
