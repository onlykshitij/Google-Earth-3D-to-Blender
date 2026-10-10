import type { Bbox, Corner } from "../types";

/**
 * Tilted areas: a box drawn on a rotated map.
 *
 * On the ground that box is a rectangle that is not lined up with latitude and
 * longitude. It travels as its four corners, beside the north-up bbox that
 * encloses it, and the exporter probes only the lattice points inside it.
 */

const METRES_PER_DEGREE_LAT = 111_320;

/** Below this tilt a box counts as north-up, and is sent as a plain bbox. */
export const MIN_TILT_DEG = 0.05;

/**
 * Point test for a polygon, with points within `margin` degrees of the outline
 * counting as inside.
 *
 * A copy of vendor/earth-exporter/src/utils/area.ts, which decides what the
 * exporter actually probes. area.check.ts compares the two.
 */
export function makeAreaTest(
  corners: Corner[],
  margin: number,
): (lat: number, lng: number) => boolean {
  const meanLat = corners.reduce((sum, c) => sum + c[0], 0) / corners.length;
  const k = Math.cos((meanLat * Math.PI) / 180);
  const xs = corners.map((c) => c[1] * k);
  const ys = corners.map((c) => c[0]);
  const n = corners.length;
  const margin2 = margin * margin;

  return (lat: number, lng: number): boolean => {
    const x = lng * k;
    const y = lat;

    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      if (
        ys[i] > y !== ys[j] > y &&
        x < ((xs[j] - xs[i]) * (y - ys[i])) / (ys[j] - ys[i]) + xs[i]
      ) {
        inside = !inside;
      }
    }
    if (inside) return true;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const dx = xs[i] - xs[j];
      const dy = ys[i] - ys[j];
      const len2 = dx * dx + dy * dy;
      const t =
        len2 === 0
          ? 0
          : Math.max(0, Math.min(1, ((x - xs[j]) * dx + (y - ys[j]) * dy) / len2));
      const ex = xs[j] + t * dx - x;
      const ey = ys[j] + t * dy - y;
      if (ex * ex + ey * ey <= margin2) return true;
    }
    return false;
  };
}

/** The north-up bbox around some corners. */
export function envelope(corners: Corner[]): Bbox {
  return {
    minLat: Math.min(...corners.map((c) => c[0])),
    maxLat: Math.max(...corners.map((c) => c[0])),
    minLng: Math.min(...corners.map((c) => c[1])),
    maxLng: Math.max(...corners.map((c) => c[1])),
  };
}

/** Metres east and north from `a` to `b`, in a flat local frame. */
function offset(a: Corner, b: Corner): [number, number] {
  const k = Math.cos((((a[0] + b[0]) / 2) * Math.PI) / 180);
  return [
    (b[1] - a[1]) * k * METRES_PER_DEGREE_LAT,
    (b[0] - a[0]) * METRES_PER_DEGREE_LAT,
  ];
}

/**
 * How far a rectangle's first edge turns from east, in degrees, folded into
 * -45..45. Zero for a north-up box.
 */
export function tiltDegrees(corners: Corner[]): number {
  const [dx, dy] = offset(corners[0], corners[1]);
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  // A rectangle looks the same turned by 90 degrees, so fold into one quadrant.
  deg = ((((deg + 45) % 90) + 90) % 90) - 45;
  return Math.abs(deg) < 1e-9 ? 0 : deg;
}

/** Side lengths of a rectangle given by four corners, in metres. */
export function rectangleSize(corners: Corner[]): { width: number; height: number } {
  const [ax, ay] = offset(corners[0], corners[1]);
  const [bx, by] = offset(corners[1], corners[2]);
  return { width: Math.hypot(ax, ay), height: Math.hypot(bx, by) };
}

/** Whether these corners make a box worth sending as a tilted area. */
export function isTilted(corners: Corner[]): boolean {
  return Math.abs(tiltDegrees(corners)) >= MIN_TILT_DEG;
}

/** Above this many lattice points, the probe count is estimated by area. */
const COUNT_LIMIT = 1_500_000;

/**
 * How many lattice points the exporter will probe for a tilted area, on a
 * lattice of `step` degrees.
 *
 * Walks the same lattice the exporter does and applies the same test. A huge
 * area is estimated from the area ratio instead, since the answer only picks a
 * "very slow" warning by then.
 */
export function probeCountInArea(
  bbox: Bbox,
  corners: Corner[],
  step: number,
): number {
  const rows = Math.floor((bbox.maxLat - bbox.minLat) / step) + 1;
  const cols = Math.floor((bbox.maxLng - bbox.minLng) / step) + 1;

  if (rows * cols > COUNT_LIMIT) {
    const box = (bbox.maxLat - bbox.minLat) * (bbox.maxLng - bbox.minLng);
    const size = rectangleSize(corners);
    const k = Math.cos((((bbox.minLat + bbox.maxLat) / 2) * Math.PI) / 180);
    const rect =
      (size.width * size.height) / (METRES_PER_DEGREE_LAT * METRES_PER_DEGREE_LAT * k);
    return Math.max(1, Math.round(rows * cols * Math.min(1, rect / box)));
  }

  // The margin is one step, as in the exporter.
  const inside = makeAreaTest(corners, step);
  let count = 0;
  for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += step) {
    for (let lng = bbox.minLng; lng <= bbox.maxLng; lng += step) {
      if (inside(lat, lng)) count++;
    }
  }
  return Math.max(1, count);
}

/** Round corners to 7 places, about a centimetre. */
export function roundCorners(corners: Corner[]): Corner[] {
  const f = (v: number) => Number(v.toFixed(7));
  return corners.map(([lat, lng]) => [f(lat), f(lng)]);
}
