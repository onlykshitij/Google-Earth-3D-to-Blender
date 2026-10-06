import { useEffect, useMemo, useRef, useState } from "react";
import { isShortMapsLink, parseLocation } from "../lib/geo";
import { geocodeUrl } from "../lib/settings";

export type Pick = {
  lat: number;
  lon: number;
  zoom?: number;
  boundingbox: [number, number, number, number] | null;
};

type Result = {
  label: string;
  lat: number;
  lon: number;
  boundingbox: [number, number, number, number] | null;
};

type Props = {
  onPick: (r: Pick) => void;
  /** Nominatim-compatible search template. Empty uses the public Nominatim. */
  geocoderUrl: string;
};

/**
 * One field for three kinds of input: a place name to geocode, a coordinate
 * pair, or a Google Maps link.
 *
 * Coordinates and links are resolved locally and instantly, so pasting a link
 * never touches the geocoder. Only free text is sent to the geocoder, debounced
 * and one request at a time, since the default one is a shared public service.
 */
export function SearchBox({ onPick, geocoderUrl }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Recognising a location as you type is what suppresses the geocoder below.
  const direct = useMemo(() => parseLocation(query), [query]);
  const shortLink = useMemo(
    () => !direct && isShortMapsLink(query),
    [direct, query],
  );

  useEffect(() => {
    const term = query.trim();
    if (direct || shortLink || term.length < 3) {
      setResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setBusy(true);
      try {
        const url = geocodeUrl(geocoderUrl, term);
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Array<{
          display_name: string;
          lat: string;
          lon: string;
          boundingbox?: string[];
        }>;
        setResults(
          data.map((d) => ({
            label: d.display_name,
            lat: Number(d.lat),
            lon: Number(d.lon),
            boundingbox:
              d.boundingbox && d.boundingbox.length === 4
                ? (d.boundingbox.map(Number) as [number, number, number, number])
                : null,
          })),
        );
        setOpen(true);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setBusy(false);
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, direct, shortLink, geocoderUrl]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const goDirect = () => {
    if (!direct) return;
    onPick({
      lat: direct.lat,
      lon: direct.lng,
      zoom: direct.zoom,
      boundingbox: null,
    });
    setOpen(false);
  };

  return (
    <div ref={boxRef} className="pointer-events-auto relative w-[24rem]">
      <div className="panel flex items-center gap-2 px-3 py-2">
        <svg
          className="size-4 shrink-0 text-ink-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (results || direct || shortLink) && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (direct) goDirect();
            else if (results && results.length) {
              const r = results[0];
              onPick({ ...r, lon: r.lon });
              setOpen(false);
            }
          }}
          placeholder="Place, coordinates, or a Google Maps link"
          className="w-full bg-transparent text-sm outline-none placeholder:text-ink-400"
        />
        {busy && (
          <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
        )}
        {direct && (
          <button
            onClick={goDirect}
            className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[11px] font-medium text-ink-950 transition hover:bg-accent-bright"
          >
            Go
          </button>
        )}
      </div>

      {/* Recognised coordinates get their own confirmation row, so it is obvious
          the paste was understood before anything moves. */}
      {direct && (
        <div className="panel absolute top-full left-0 mt-2 w-full px-3 py-2">
          <p className="text-[11px] text-ink-400">
            Jump to{" "}
            <span className="numeric text-ink-200">
              {direct.lat.toFixed(6)}, {direct.lng.toFixed(6)}
            </span>
            {direct.zoom ? ` at zoom ${direct.zoom}` : ""} — press Enter or Go.
          </p>
        </div>
      )}

      {shortLink && (
        <div className="panel absolute top-full left-0 mt-2 w-full px-3 py-2">
          <p className="text-[11px] leading-snug text-[#f7d78a]">
            Shortened Maps links do not contain coordinates. Open it in Google
            Maps, then copy the full address bar URL — or the coordinates
            themselves.
          </p>
        </div>
      )}

      {open && !direct && !shortLink && results && (
        <div className="panel absolute top-full left-0 mt-2 max-h-72 w-full overflow-y-auto p-1">
          {results.length === 0 && (
            <p className="px-3 py-2 text-sm text-ink-400">Nothing found.</p>
          )}
          {results.map((r, i) => (
            <button
              key={`${r.lat},${r.lon},${i}`}
              onClick={() => {
                onPick(r);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-ink-300 transition hover:bg-white/[0.06] hover:text-ink-200"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
