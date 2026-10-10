/**
 * Checks for tilted areas, and that the interface's copy of the area test
 * agrees with the exporter's, which decides what is actually downloaded.
 *
 *   cd web && npx esbuild src/lib/area.check.ts --bundle --platform=node \
 *       --outfile=../dist/area.check.cjs && node ../dist/area.check.cjs
 */

import type { Corner } from "../types";
import {
  envelope,
  isTilted,
  makeAreaTest,
  probeCountInArea,
  rectangleSize,
  tiltDegrees,
} from "./area";
import {
  makeAreaTest as exporterAreaTest,
  parseCorners,
} from "../../../vendor/earth-exporter/src/utils/area";

let failures = 0;

function check(label: string, ok: boolean, detail: unknown = "") {
  if (!ok) failures++;
  console.log(`[${ok ? "ok  " : "FAIL"}] ${label.padEnd(52)} ${detail === "" ? "" : JSON.stringify(detail)}`);
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const STEP = 0.0001;

/**
 * A rectangle `w` by `h` metres centred on (lat, lng), turned `deg` clockwise
 * on the ground, as a box drawn on a map rotated by `deg` would be.
 */
function rotatedRect(lat: number, lng: number, w: number, h: number, deg: number): Corner[] {
  const k = Math.cos((lat * Math.PI) / 180);
  const a = (-deg * Math.PI) / 180;
  const half: [number, number][] = [
    [-w / 2, h / 2],
    [w / 2, h / 2],
    [w / 2, -h / 2],
    [-w / 2, -h / 2],
  ];
  return half.map(([x, y]) => {
    const east = x * Math.cos(a) - y * Math.sin(a);
    const north = x * Math.sin(a) + y * Math.cos(a);
    return [lat + north / 111_320, lng + east / (111_320 * k)];
  });
}

// --- the two copies agree ----------------------------------------------
const shapes: [string, Corner[]][] = [
  ["30° rectangle in Pisa", rotatedRect(43.7231, 10.3963, 180, 60, 30)],
  ["-62° strip in Zwickau", rotatedRect(50.7, 12.49, 400, 40, -62)],
  ["45° square near the equator", rotatedRect(0.5, 30, 120, 120, 45)],
  ["triangle", [[43.7235, 10.3955], [43.7235, 10.397], [43.7225, 10.3962]]],
];
for (const [name, corners] of shapes) {
  const ours = makeAreaTest(corners, STEP);
  const theirs = exporterAreaTest(corners, STEP);
  const box = envelope(corners);
  let disagree = 0;
  let tested = 0;
  for (let lat = box.minLat - 3 * STEP; lat <= box.maxLat + 3 * STEP; lat += STEP / 3) {
    for (let lng = box.minLng - 3 * STEP; lng <= box.maxLng + 3 * STEP; lng += STEP / 3) {
      tested++;
      if (ours(lat, lng) !== theirs(lat, lng)) disagree++;
    }
  }
  check(`interface and exporter agree: ${name}`, disagree === 0 && tested > 100, { tested, disagree });
}

// --- the test itself -----------------------------------------------------
const rect = rotatedRect(43.7231, 10.3963, 200, 50, 30);
const inside = makeAreaTest(rect, STEP);
check("the centre is inside", inside(43.7231, 10.3963));
check("a corner of the bbox is outside", !inside(envelope(rect).maxLat, envelope(rect).minLng));
// 8 m beyond the middle of the long top edge, inside the one-step margin.
const k = Math.cos((43.7231 * Math.PI) / 180);
const a = (-30 * Math.PI) / 180;
const out = (m: number): [number, number] => [
  43.7231 + ((25 + m) * Math.cos(a)) / 111_320,
  10.3963 + (-(25 + m) * Math.sin(a)) / (111_320 * k),
];
check("8 m outside an edge counts, within the margin", inside(...out(8)));
check("20 m outside an edge does not", !inside(...out(20)));

// --- tilt and size -------------------------------------------------------
check("a north-up box has no tilt", tiltDegrees(rotatedRect(43.7, 10.4, 100, 50, 0)) === 0);
check("a north-up box is not tilted", !isTilted(rotatedRect(43.7, 10.4, 100, 50, 0)));
check("30° is read back as 30°", near(Math.abs(tiltDegrees(rect)), 30, 0.01), tiltDegrees(rect));
check("tilt folds into -45..45", near(Math.abs(tiltDegrees(rotatedRect(43.7, 10.4, 100, 50, 80))), 10, 0.01));
check("a 0.01° tilt is too small to count", !isTilted(rotatedRect(43.7, 10.4, 100, 50, 0.01)));
const size = rectangleSize(rect);
check("sides are measured along the rectangle", near(size.width, 200, 0.5) && near(size.height, 50, 0.5), size);

// --- probe count ---------------------------------------------------------
const tiltedCount = probeCountInArea(envelope(rect), rect, STEP);
const box = envelope(rect);
const boxCount =
  (Math.floor((box.maxLat - box.minLat) / STEP) + 1) *
  (Math.floor((box.maxLng - box.minLng) / STEP) + 1);
check("a tilted strip probes far fewer points than its bbox", tiltedCount < boxCount * 0.75, { tiltedCount, boxCount });

// --- the exporter's --polygon parser --------------------------------------
check("parses lat,lng;lat,lng;lat,lng", JSON.stringify(parseCorners("1,2;3,4;5,6")) === "[[1,2],[3,4],[5,6]]");
for (const [label, text] of [
  ["two corners", "1,2;3,4"],
  ["a missing longitude", "1,2;3;5,6"],
  ["a latitude out of range", "1,2;95,4;5,6"],
  ["words", "a,b;c,d;e,f"],
]) {
  let threw = false;
  try {
    parseCorners(text);
  } catch {
    threw = true;
  }
  check(`the parser refuses ${label}`, threw);
}

console.log("\n" + "=".repeat(62));
console.log(failures ? `${failures} FAILED` : "ALL CHECKS PASSED");
console.log("=".repeat(62));
process.exit(failures ? 1 : 0);
