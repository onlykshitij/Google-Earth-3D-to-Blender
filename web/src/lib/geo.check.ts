/**
 * Checks for the location parser.
 *
 *   cd web && npx esbuild src/lib/geo.check.ts --bundle --platform=node \
 *       --outfile=../dist/geo.check.cjs && node ../dist/geo.check.cjs
 */

import { isShortMapsLink, parseLocation } from "./geo";

let failures = 0;

function near(a: number, b: number, tol = 1e-6) {
  return Math.abs(a - b) <= tol;
}

function expect(
  label: string,
  input: string,
  want: { lat: number; lng: number; zoom?: number } | null,
) {
  const got = parseLocation(input);
  let ok: boolean;
  if (want === null) {
    ok = got === null;
  } else {
    ok =
      got !== null &&
      near(got.lat, want.lat) &&
      near(got.lng, want.lng) &&
      (want.zoom === undefined || got.zoom === want.zoom);
  }
  if (!ok) failures++;
  const shown = got ? `${got.lat}, ${got.lng}${got.zoom ? ` @${got.zoom}` : ""}` : "null";
  console.log(
    `[${ok ? "ok  " : "FAIL"}] ${label.padEnd(42)} -> ${shown}`,
  );
}

const PISA = { lat: 43.7231, lng: 10.3963 };

console.log("--- plain coordinates ---");
expect("comma separated", "43.7231, 10.3963", PISA);
expect("no space", "43.7231,10.3963", PISA);
expect("space separated", "43.7231 10.3963", PISA);
expect("semicolon", "43.7231;10.3963", PISA);
expect("negative both", "-33.8688, -151.2093", { lat: -33.8688, lng: -151.2093 });
expect("zero coordinates", "0, 0", { lat: 0, lng: 0 });
expect("integers", "43, 10", { lat: 43, lng: 10 });

console.log("\n--- degrees, minutes, seconds ---");
expect("DMS with hemispheres", `43°43'23.2"N 10°23'46.7"E`, {
  lat: 43 + 43 / 60 + 23.2 / 3600,
  lng: 10 + 23 / 60 + 46.7 / 3600,
});
expect("DMS southern and western", `33°51'7.9"S 151°12'33.5"W`, {
  lat: -(33 + 51 / 60 + 7.9 / 3600),
  lng: -(151 + 12 / 60 + 33.5 / 3600),
});

console.log("\n--- Google Maps URLs ---");
expect(
  "view centre with zoom",
  "https://www.google.com/maps/@43.7231,10.3963,18z",
  { ...PISA, zoom: 18 },
);
expect(
  "place URL, marker wins over view",
  "https://www.google.com/maps/place/Piazza+del+Duomo/@43.5,10.5,17z/data=!4m5!3m4!1s0x0:0x0!8m2!3d43.7231!4d10.3963",
  PISA,
);
expect(
  "q parameter",
  "https://maps.google.com/?q=43.7231,10.3963",
  PISA,
);
expect(
  "ll parameter",
  "https://maps.google.com/maps?ll=43.7231,10.3963&z=17",
  PISA,
);
expect(
  "search URL with @",
  "https://www.google.com/maps/search/pisa/@43.7231,10.3963,15.5z?entry=ttu",
  { ...PISA, zoom: 16 },
);
expect(
  "bare host with @",
  "google.com/maps/@43.7231,10.3963,18z",
  { ...PISA, zoom: 18 },
);

console.log("\n--- rejected ---");
expect("a place name", "Piazza dei Miracoli, Pisa", null);
expect("empty", "", null);
expect("latitude out of range", "95.0, 10.0", null);
expect("longitude out of range", "43.0, 200.0", null);
expect("one number only", "43.7231", null);
expect("three numbers", "43.7231, 10.3963, 5", null);
expect("url with no coordinates", "https://www.google.com/maps", null);
expect("short link has none", "https://maps.app.goo.gl/AbCdEf123", null);

console.log("\n--- short link detection ---");
const shorts: Array<[string, boolean]> = [
  ["https://maps.app.goo.gl/AbCdEf123", true],
  ["https://goo.gl/maps/xyz", true],
  ["https://www.google.com/maps/@43.7,10.3,18z", false],
  ["43.7231, 10.3963", false],
];
for (const [input, want] of shorts) {
  const got = isShortMapsLink(input);
  const ok = got === want;
  if (!ok) failures++;
  console.log(`[${ok ? "ok  " : "FAIL"}] short link ${String(want).padEnd(6)} ${input}`);
}

console.log("\n" + "=".repeat(62));
console.log(failures ? `${failures} FAILED` : "ALL CHECKS PASSED");
console.log("=".repeat(62));
process.exit(failures ? 1 : 0);
