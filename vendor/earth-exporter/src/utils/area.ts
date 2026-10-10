/**
 * Which probe points belong to a tilted export area.
 *
 * A box drawn on a rotated map is a rectangle on the ground that is not lined
 * up with latitude and longitude. The probe lattice still covers the whole
 * north-up box around it, and this test lets the walk skip the points outside.
 *
 * Kept in step with web/src/lib/area.ts, which uses the same test to estimate
 * the probe count before an export. web/src/lib/area.check.ts compares them.
 */

/** A corner of the area, as [latitude, longitude]. */
export type Corner = [number, number];

/**
 * Build a point test for the polygon `corners`.
 *
 * The test works in a flat frame with longitude scaled by the cosine of the
 * area's mean latitude, which keeps right angles right over a city-sized area.
 * Points within `margin` degrees of the outline also pass. Without that, an
 * octant straddling a slanted edge is missed whenever every lattice point inside
 * it happens to fall just outside the edge, which leaves notches along it.
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

    // Even-odd ray cast.
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

    // Distance to each edge.
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

/**
 * Parse `lat,lng;lat,lng;...` into corners. Throws with a reason when the text
 * is not 3 to 16 valid coordinate pairs.
 */
export function parseCorners(text: string): Corner[] {
  const corners = text
    .trim()
    .replace(/['"]/g, '')
    .split(';')
    .filter((part) => part.trim())
    .map((part) => part.split(',').map((s) => Number(s.trim())));

  if (corners.length < 3 || corners.length > 16) {
    throw new Error(`--polygon needs 3 to 16 corners, got ${corners.length}`);
  }
  for (const corner of corners) {
    const [lat, lng] = corner;
    if (
      corner.length !== 2 ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      throw new Error(
        `Wrong --polygon corner "${corner.join(',')}". Use --polygon=lat,lng;lat,lng;lat,lng`,
      );
    }
  }
  return corners as Corner[];
}
