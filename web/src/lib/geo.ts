import type { Bbox, Corner } from "../types";
import { probeCountInArea } from "./area";

const METRES_PER_DEGREE_LAT = 111_320;

/** Ground size of a bbox in metres, accounting for latitude convergence. */
export function bboxSize(bbox: Bbox): { width: number; height: number } {
  const midLat = ((bbox.minLat + bbox.maxLat) / 2) * (Math.PI / 180);
  return {
    width: Math.abs(bbox.maxLng - bbox.minLng) * METRES_PER_DEGREE_LAT * Math.cos(midLat),
    height: Math.abs(bbox.maxLat - bbox.minLat) * METRES_PER_DEGREE_LAT,
  };
}

export function isEmpty(bbox: Bbox | null): boolean {
  if (!bbox) return true;
  return bbox.maxLat <= bbox.minLat || bbox.maxLng <= bbox.minLng;
}

/**
 * The exporter walks a fixed 0.0001-degree lattice over the bbox, resolving the
 * octant tree at every point, so download time tracks that point count far
 * better than it tracks ground area. Surfacing the count is the only honest way
 * to warn about a selection that will take a very long time.
 */
export const PROBE_STEP_DEG = 0.0001;

export function probeCount(bbox: Bbox): number {
  if (isEmpty(bbox)) return 0;
  const rows = Math.ceil((bbox.maxLat - bbox.minLat) / PROBE_STEP_DEG);
  const cols = Math.ceil((bbox.maxLng - bbox.minLng) / PROBE_STEP_DEG);
  return Math.max(1, rows) * Math.max(1, cols);
}

export type Cost = {
  probes: number;
  label: string;
  detail: string;
  severity: "ok" | "warn" | "heavy";
};

/** `corners` narrows the count to a tilted area inside the bbox. */
export function estimateCost(
  bbox: Bbox | null,
  corners: Corner[] | null = null,
): Cost | null {
  if (!bbox || isEmpty(bbox)) return null;
  const probes = corners
    ? probeCountInArea(bbox, corners, PROBE_STEP_DEG)
    : probeCount(bbox);

  if (probes <= 400) {
    return { probes, label: "Quick", severity: "ok", detail: "under a minute" };
  }
  if (probes <= 2500) {
    return { probes, label: "Moderate", severity: "ok", detail: "a minute or two" };
  }
  if (probes <= 10_000) {
    return { probes, label: "Slow", severity: "warn", detail: "several minutes" };
  }
  return {
    probes,
    label: "Very slow",
    severity: "heavy",
    detail: "likely 10 minutes or more - consider a smaller area",
  };
}

export function formatMetres(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

/** Trim a bbox to the given number of decimal places, avoiding float noise. */
export function roundBbox(bbox: Bbox, places = 6): Bbox {
  const f = (v: number) => Number(v.toFixed(places));
  return {
    minLat: f(bbox.minLat),
    minLng: f(bbox.minLng),
    maxLat: f(bbox.maxLat),
    maxLng: f(bbox.maxLng),
  };
}

export function normaliseBbox(a: [number, number], b: [number, number]): Bbox {
  return {
    minLat: Math.min(a[0], b[0]),
    maxLat: Math.max(a[0], b[0]),
    minLng: Math.min(a[1], b[1]),
    maxLng: Math.max(a[1], b[1]),
  };
}

export function bboxToText(bbox: Bbox): string {
  const f = (v: number) => v.toFixed(6);
  return `${f(bbox.minLat)},${f(bbox.minLng)},${f(bbox.maxLat)},${f(bbox.maxLng)}`;
}

export type Place = { lat: number; lng: number; zoom?: number };

function valid(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** `43°43'23.2"N 10°23'46.7"E` — what Google Maps copies from a dropped pin. */
function parseDms(text: string): Place | null {
  const part = String.raw`(\d+(?:\.\d+)?)[°:\s]+(?:(\d+(?:\.\d+)?)['′:\s]+)?(?:(\d+(?:\.\d+)?)["″]?\s*)?([NSEW])`;
  const matches = [...text.matchAll(new RegExp(part, "gi"))];
  if (matches.length < 2) return null;

  const values: Partial<Record<"N" | "S" | "E" | "W", number>> = {};
  for (const m of matches.slice(0, 2)) {
    const deg = Number(m[1]);
    const min = Number(m[2] ?? 0);
    const sec = Number(m[3] ?? 0);
    const hemi = m[4].toUpperCase() as "N" | "S" | "E" | "W";
    values[hemi] = deg + min / 60 + sec / 3600;
  }

  const lat =
    values.N !== undefined ? values.N : values.S !== undefined ? -values.S : NaN;
  const lng =
    values.E !== undefined ? values.E : values.W !== undefined ? -values.W : NaN;

  return valid(lat, lng) ? { lat, lng } : null;
}

/**
 * Work out a location from whatever was pasted.
 *
 * Accepts a bare `lat, lng` pair, degrees-minutes-seconds, and the several
 * shapes a Google Maps URL comes in. Returns null for anything else, which the
 * caller treats as a place name to geocode.
 */
export function parseLocation(text: string): Place | null {
  const raw = text.trim();
  if (!raw) return null;

  const num = String.raw`(-?\d+(?:\.\d+)?)`;

  // A plain coordinate pair, comma, semicolon or whitespace separated.
  const plain = raw.match(new RegExp(`^${num}\\s*[,;\\s]\\s*${num}$`));
  if (plain) {
    const lat = Number(plain[1]);
    const lng = Number(plain[2]);
    if (valid(lat, lng)) return { lat, lng };
  }

  const dms = parseDms(raw);
  if (dms) return dms;

  const looksLikeUrl = /^https?:\/\/|maps\.|goo\.gl|google\./i.test(raw);
  if (!looksLikeUrl) return null;

  // Ordered by how well each identifies the thing the user actually meant:
  // the !3d/!4d pair is the marked place, @ is only wherever the view happened
  // to be, and q/ll are explicit coordinate parameters.
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`@${num},${num}(?:,(\\d+(?:\\.\\d+)?)z)?`),
    new RegExp(`[?&](?:q|ll|sll|center|daddr)=${num},${num}`, "i"),
    new RegExp(`/place/${num},${num}`),
  ];

  for (const pattern of patterns) {
    const m = raw.match(pattern);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!valid(lat, lng)) continue;
    const zoom = m[3] ? Math.round(Number(m[3])) : undefined;
    return zoom ? { lat, lng, zoom } : { lat, lng };
  }

  return null;
}

/**
 * A shortened Google Maps link carries no coordinates - they only appear after
 * the redirect, which the browser cannot follow across origins.
 */
export function isShortMapsLink(text: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(text.trim());
}

export function parseBboxText(text: string): Bbox | null {
  const parts = text
    .replace(/[;\s]+/g, ",")
    .split(",")
    .filter(Boolean)
    .map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLat, minLng, maxLat, maxLng] = parts;
  return normaliseBbox([minLat, minLng], [maxLat, maxLng]);
}
