import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { BASEMAPS, MapCanvas, type BasemapKey } from "./components/MapCanvas";
import { SearchBox } from "./components/SearchBox";
import { Sidebar } from "./components/Sidebar";
import { InstancePicker } from "./components/InstancePicker";
import { VersionChip } from "./components/VersionChip";
import * as api from "./api";
import type { Bbox, ExportOptions, Instance, Session } from "./types";
import { TERMINAL_PHASES } from "./types";
import { isEmpty, roundBbox } from "./lib/geo";

const DEFAULT_OPTIONS: ExportOptions = {
  level: 20,
  levelGround: true,
  groundCellSize: 4,
  scale: 1,
  joinObjects: false,
  shadeSmooth: true,
  lockReference: true,
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

  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [drawing, setDrawing] = useState(true);
  const [basemap, setBasemap] = useState<BasemapKey>("dark");
  const [options, setOptionsState] = useState<ExportOptions>(DEFAULT_OPTIONS);

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
      await api.startExport(session.token, selected.id, bbox, options);
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

  const useCurrentView = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    // Inset a little so the selection reads as a selection, not the whole frame.
    const latPad = (b.getNorth() - b.getSouth()) * 0.15;
    const lngPad = (b.getEast() - b.getWest()) * 0.15;
    setBbox(
      roundBbox({
        minLat: b.getSouth() + latPad,
        maxLat: b.getNorth() - latPad,
        minLng: b.getWest() + lngPad,
        maxLng: b.getEast() - lngPad,
      }),
    );
    setDrawing(false);
  };

  const onlineCount = instances.filter((i) => i.online).length;

  return (
    <div className="relative h-full w-full">
      <MapCanvas
        basemap={basemap}
        bbox={bbox}
        drawing={drawing}
        onBbox={setBbox}
        onDrawingEnd={() => setDrawing(false)}
        onMapReady={(m) => {
          mapRef.current = m;
        }}
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
            </div>

            <SearchBox
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
                setDrawing(true);
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
              {(Object.keys(BASEMAPS) as BasemapKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setBasemap(key)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${
                    basemap === key
                      ? "bg-accent/90 text-ink-950"
                      : "text-ink-400 hover:bg-white/[0.06] hover:text-ink-200"
                  }`}
                >
                  {BASEMAPS[key].name}
                </button>
              ))}
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

        <Sidebar
          token={session?.token ?? ""}
          instance={selected}
          onlineCount={onlineCount}
          hubConnected={connected}
          bbox={bbox}
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
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
