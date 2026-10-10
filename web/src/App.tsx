import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import {
  basemapsFor,
  MapCanvas,
  screenRectCorners,
  type BasemapKey,
} from "./components/MapCanvas";
import { RotationDial } from "./components/RotationDial";
import { SearchBox } from "./components/SearchBox";
import { SettingsDialog } from "./components/SettingsDialog";
import { Sidebar } from "./components/Sidebar";
import { InstancePicker } from "./components/InstancePicker";
import { VersionChip } from "./components/VersionChip";
import * as api from "./api";
import type {
  Bbox,
  Corner,
  ExportOptions,
  Instance,
  MapSettings,
  Session,
} from "./types";
import { TERMINAL_PHASES } from "./types";
import { isEmpty, roundBbox } from "./lib/geo";
import { envelope, isTilted, roundCorners } from "./lib/area";
import * as settings from "./lib/settings";

const DEFAULT_OPTIONS: ExportOptions = {
  level: 20,
  levelGround: true,
  groundCellSize: 4,
  scale: 1,
  joinObjects: false,
  shadeSmooth: true,
  lockReference: false,
  adjustClipping: true,
  replacePrevious: false,
  collectionName: "",
  trimSubGround: false,
  trimDepth: 2,
  exportDir: "",
};

// Poll briskly while work is in flight, steadily otherwise: the instance list
// doubles as the liveness signal, so it should not go stale.
const POLL_ACTIVE_MS = 600;
const POLL_IDLE_MS = 1600;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bbox, setBboxState] = useState<Bbox | null>(null);
  // The selection's corners when it is tilted, which happens when it was drawn
  // on a rotated map. The bbox then encloses them.
  const [corners, setCorners] = useState<Corner[] | null>(null);
  const [bearing, setBearing] = useState(0);
  // The map pans by default. Starting in drawing mode meant a drag drew a
  // box instead of moving the map, so you could not get anywhere first.
  const [drawing, setDrawing] = useState(false);
  const [basemap, setBasemap] = useState<BasemapKey>("dark");
  const [options, setOptionsState] = useState<ExportOptions>(DEFAULT_OPTIONS);

  // This browser's map settings, layered over the hub's defaults.
  const [localSettings, setLocalSettings] = useState<Partial<MapSettings>>(
    settings.loadLocal,
  );
  const [storageWorks] = useState(settings.storageAvailable);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const mapSettings = useMemo(
    () => settings.effective(session?.mapSettings, localSettings),
    [session, localSettings],
  );
  const basemaps = useMemo(() => basemapsFor(mapSettings), [mapSettings]);
  // A layer can disappear when a key is removed, so fall back to the first.
  const layer = basemaps.find((b) => b.key === basemap) ?? basemaps[0];

  const saveSettings = (next: Partial<MapSettings>) => {
    settings.saveLocal(next);
    setLocalSettings(settings.clean(next));
    setSettingsOpen(false);
  };

  const mapRef = useRef<LeafletMap | null>(null);

  const setOptions = useCallback((patch: Partial<ExportOptions>) => {
    setOptionsState((prev) => ({ ...prev, ...patch }));
  }, []);

  // --- session -------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.getSession();
        if (cancelled) return;
        setSession(s);
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- polling -------------------------------------------------------------
  const selected = useMemo(
    () => instances.find((i) => i.id === selectedId && i.online) ?? null,
    [instances, selectedId],
  );
  const job = selected?.state?.job ?? null;
  const jobRunning = job !== null && !TERMINAL_PHASES.includes(job.phase);

  useEffect(() => {
    let timer = 0;
    let stopped = false;

    const poll = async () => {
      try {
        const { instances: list } = await api.getInstances();
        if (stopped) return;
        setInstances(list);
        setConnected(true);

        // Keep the current choice if it is still there, otherwise fall back to
        // the first live session so the common single-Blender case needs no
        // interaction at all.
        setSelectedId((current) => {
          const online = list.filter((i) => i.online);
          if (current && online.some((i) => i.id === current)) return current;
          return online.length ? online[0].id : null;
        });
      } catch {
        if (!stopped) setConnected(false);
      }
      if (!stopped) {
        timer = window.setTimeout(poll, jobRunning ? POLL_ACTIVE_MS : POLL_IDLE_MS);
      }
    };

    poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [jobRunning]);

  // Adopt the chosen instance's own add-on defaults, once per instance, so the
  // interface agrees with what that Blender's sidebar shows.
  const adoptedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!selected || adoptedFor.current === selected.id) return;
    adoptedFor.current = selected.id;
    const defaults = selected.info?.defaults;
    if (defaults) setOptionsState((prev) => ({ ...prev, ...defaults }));
  }, [selected]);

  // --- actions -------------------------------------------------------------
  const handleExport = async () => {
    if (!session || !selected || !bbox || isEmpty(bbox)) return;
    setError(null);
    try {
      await api.startExport(session.token, selected.id, bbox, options, corners);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRetry = async () => {
    if (!session || !selected) return;
    setError(null);
    try {
      await api.retryExport(session.token, selected.id, options);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCancel = async () => {
    if (!session || !selected) return;
    try {
      await api.cancelExport(session.token, selected.id);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /** A typed-in bbox is north-up, so it replaces any tilted area. */
  const setBbox = useCallback((next: Bbox) => {
    setBboxState(next);
    setCorners(null);
  }, []);

  /**
   * Take a box drawn on screen. On a rotated map its corners make a tilted
   * area; otherwise they reduce to a plain bbox, exactly as before rotation.
   */
  const setArea = useCallback((drawn: Corner[]) => {
    if (isTilted(drawn)) {
      const rounded = roundCorners(drawn);
      setBboxState(roundBbox(envelope(rounded)));
      setCorners(rounded);
    } else {
      setBboxState(roundBbox(envelope(drawn)));
      setCorners(null);
    }
  }, []);

  const rotateTo = (degrees: number) => {
    mapRef.current?.setBearing(degrees);
  };
  const rotateBy = (degrees: number) => {
    const map = mapRef.current;
    if (map) map.setBearing(map.getBearing() + degrees);
  };

  const useCurrentView = () => {
    const map = mapRef.current;
    if (!map) return;
    // Inset a little so the selection reads as a selection, not the whole
    // frame. Taken in screen space, so a rotated view gives a tilted area.
    const size = map.getSize();
    setArea(
      screenRectCorners(
        map,
        size.multiplyBy(0.15),
        size.multiplyBy(0.85),
      ),
    );
    setDrawing(false);
  };

  const onlineCount = instances.filter((i) => i.online).length;

  return (
    <div className="relative h-full w-full">
      <MapCanvas
        layer={layer}
        bbox={bbox}
        corners={corners}
        drawing={drawing}
        onCorners={setArea}
        onDrawingEnd={() => setDrawing(false)}
        onMapReady={(m) => {
          mapRef.current = m;
        }}
        onBearing={setBearing}
      />

      {/* Overlay chrome. The wrapper ignores pointer events so the map stays
          draggable everywhere the panels are not, and sits above Leaflet's own
          panes and controls, which claim z-index up to 1000. */}
      <div className="pointer-events-none absolute inset-0 z-[1100] flex">
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <div className="flex items-start gap-2">
            <div className="panel pointer-events-auto flex items-center gap-2.5 px-3 py-2">
              <span className="text-sm font-semibold tracking-tight text-ink-200">
                Google Map Export Bridge
              </span>
              <InstancePicker
                instances={instances}
                selectedId={selectedId}
                onSelect={setSelectedId}
                connected={connected}
              />
              <VersionChip version={session?.version ?? ""} />
              <button
                onClick={() => setSettingsOpen(true)}
                className="-mr-1 rounded-md p-1 text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-200"
                aria-label="Map settings"
                title="Map settings: keys for map layers and search"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>

            <SearchBox
              geocoderUrl={mapSettings.geocoderUrl}
              onPick={(r) => {
                const map = mapRef.current;
                if (!map) return;
                if (r.boundingbox) {
                  const [south, north, west, east] = r.boundingbox;
                  map.fitBounds(
                    [
                      [south, west],
                      [north, east],
                    ],
                    { maxZoom: 18, padding: [60, 60] },
                  );
                } else {
                  // An explicit coordinate is a point, not a region, so go in
                  // close enough to draw against buildings straight away.
                  map.flyTo([r.lat, r.lon], r.zoom ?? 18);
                }
              }}
            />

            {drawing && (
              <div className="panel pointer-events-none flex items-center gap-2 px-3 py-2 text-[11px] text-ink-300">
                <span className="size-2 animate-pulse rounded-full bg-accent" />
                Drag on the map to mark out the area
              </div>
            )}
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="panel pointer-events-auto flex gap-0.5 p-1">
              {basemaps.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setBasemap(b.key)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
                    layer.key === b.key
                      ? "bg-accent/90 text-ink-950"
                      : "text-ink-400 hover:bg-white/[0.06] hover:text-ink-200"
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="panel pointer-events-auto p-1.5">
                <RotationDial
                  bearing={bearing}
                  onChange={rotateTo}
                  onNudge={rotateBy}
                />
              </div>
              <div className="panel pointer-events-auto flex flex-col p-1">
                <button
                  onClick={() => mapRef.current?.zoomIn()}
                  className="rounded-md px-2 py-1 text-ink-300 transition hover:bg-white/[0.06]"
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  onClick={() => mapRef.current?.zoomOut()}
                  className="rounded-md px-2 py-1 text-ink-300 transition hover:bg-white/[0.06]"
                  aria-label="Zoom out"
                >
                  −
                </button>
              </div>
            </div>
          </div>
        </div>

        <Sidebar
          token={session?.token ?? ""}
          instance={selected}
          onlineCount={onlineCount}
          hubConnected={connected}
          bbox={bbox}
          corners={corners}
          setBbox={setBbox}
          options={options}
          setOptions={setOptions}
          drawing={drawing}
          setDrawing={setDrawing}
          onUseCurrentView={useCurrentView}
          job={job}
          busy={jobRunning}
          error={error}
          onExport={handleExport}
          onRetry={handleRetry}
          onCancel={handleCancel}
        />
      </div>

      {settingsOpen && (
        <SettingsDialog
          hub={session?.mapSettings ?? {}}
          local={localSettings}
          storageWorks={storageWorks}
          onSave={saveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
