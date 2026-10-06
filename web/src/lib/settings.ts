import type { MapSettings } from "../types";

/**
 * Map settings come from two places. The hub supplies defaults from its GMEB_*
 * variables, and this browser can override any of them from the settings
 * dialog. A value saved here wins over the hub's; clearing it falls back to the
 * hub's again.
 */

export const SETTING_NAMES: (keyof MapSettings)[] = [
  "cartoKey",
  "tileUrl",
  "tileAttribution",
  "geocoderUrl",
];

export const EMPTY_SETTINGS: MapSettings = {
  cartoKey: "",
  tileUrl: "",
  tileAttribution: "",
  geocoderUrl: "",
};

/** The public Nominatim instance. Its usage policy allows light, manual use. */
export const DEFAULT_GEOCODER =
  "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&q={query}";

const STORAGE_KEY = "gmeb.mapSettings";

/** Keep only known names with non-empty string values. */
export function clean(raw: unknown): Partial<MapSettings> {
  const out: Partial<MapSettings> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const name of SETTING_NAMES) {
    const value = (raw as Record<string, unknown>)[name];
    if (typeof value === "string" && value.trim()) out[name] = value.trim();
  }
  return out;
}

/** This browser's overrides. Empty when storage is blocked or unset. */
export function loadLocal(): Partial<MapSettings> {
  try {
    return clean(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"));
  } catch {
    return {};
  }
}

/** Save this browser's overrides. Returns false when storage is blocked. */
export function saveLocal(settings: Partial<MapSettings>): boolean {
  try {
    const kept = clean(settings);
    if (Object.keys(kept).length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

/** The settings in force: this browser's value if it has one, else the hub's. */
export function effective(
  hub: Partial<MapSettings> | undefined,
  local: Partial<MapSettings>,
): MapSettings {
  const fromHub = clean(hub);
  const out = { ...EMPTY_SETTINGS };
  for (const name of SETTING_NAMES) {
    out[name] = local[name] || fromHub[name] || "";
  }
  return out;
}

/**
 * Build a search request address from a template.
 *
 * `{query}` is replaced by the encoded search text. A template without it gets
 * the text appended as `q=`, which is what Nominatim and its compatible
 * services expect.
 */
export function geocodeUrl(template: string, term: string): string {
  const base = template.trim() || DEFAULT_GEOCODER;
  const encoded = encodeURIComponent(term);
  if (base.includes("{query}")) return base.split("{query}").join(encoded);
  return base + (base.includes("?") ? "&" : "?") + "q=" + encoded;
}

/** Whether this browser lets the page keep anything between visits. */
export function storageAvailable(): boolean {
  try {
    const probe = `${STORAGE_KEY}.probe`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
