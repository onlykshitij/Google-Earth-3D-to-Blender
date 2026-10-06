import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import type { Bbox, MapSettings } from "../types";
import { normaliseBbox, roundBbox } from "../lib/geo";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>';
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export type BasemapKey = "dark" | "light" | "streets" | "satellite" | "custom";

export type Basemap = {
  key: BasemapKey;
  name: string;
  url: string;
  attribution: string;
  stroke: string;
  /** Extra class on the tile layer. The keyless Dark layer darkens with it. */
  className?: string;
};

/** Whether a tile address looks usable: http(s), with {z}, {x} and {y}. */
export function isTileUrl(url: string): boolean {
  return (
    /^https?:\/\/[^\s]+$/i.test(url.trim()) &&
    ["{z}", "{x}", "{y}"].every((part) => url.includes(part))
  );
}

/**
 * Turn attribution from settings into plain text.
 *
 * Leaflet renders attribution as HTML, and this text comes from a setting
 * rather than from this code, so tags are dropped and only their text kept.
 */
function plainAttribution(html: string): string {
  const text =
    new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * The map layers on offer for the given settings.
 *
 * Dark and Light come from CARTO, which has required a key since September
 * 2026. A keyless request still gets a tile, but one that reads "API KEY
 * REQUIRED". So without a key, Dark is OpenStreetMap's tiles darkened in the
 * browser, and Light is left out because Streets already covers it.
 */
export function basemapsFor(settings: MapSettings): Basemap[] {
  const layers: Basemap[] = [];
  const cartoKey = encodeURIComponent(settings.cartoKey.trim());

  if (cartoKey) {
    layers.push(
      {
        key: "dark",
        name: "Dark",
        url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
        attribution: CARTO_ATTRIBUTION,
        stroke: "#5b9cff",
      },
      {
        key: "light",
        name: "Light",
        url: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${cartoKey}`,
        attribution: CARTO_ATTRIBUTION,
        stroke: "#1b4fa8",
      },
    );
  } else {
    layers.push({
      key: "dark",
      name: "Dark",
      url: OSM_TILES,
      attribution: OSM_ATTRIBUTION,
      stroke: "#5b9cff",
      className: "tiles-dark",
    });
  }

  layers.push(
    {
      key: "streets",
      name: "Streets",
      url: OSM_TILES,
      attribution: OSM_ATTRIBUTION,
      stroke: "#0f3f8c",
    },
    {
      key: "satellite",
      name: "Satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution:
        "Imagery &copy; Esri, Maxar, Earthstar Geographics, and the GIS community",
      stroke: "#ffd166",
    },
  );

  if (isTileUrl(settings.tileUrl)) {
    layers.push({
      key: "custom",
      name: "Custom",
      url: settings.tileUrl.trim(),
      attribution: plainAttribution(settings.tileAttribution),
      stroke: "#ff4fa3",
    });
  }

  return layers;
}

type Props = {
  layer: Basemap;
  bbox: Bbox | null;
  drawing: boolean;
  onBbox: (bbox: Bbox) => void;
  onDrawingEnd: () => void;
  onMapReady: (map: LeafletMap) => void;
};

/**
 * Drag out a rectangle.
 *
 * Map panning is suspended while drawing, otherwise the same drag would both
 * draw the box and slide the map underneath it.
 */
function AreaDrawer({
  enabled,
  onBbox,
  onDrawingEnd,
  stroke,
}: {
  enabled: boolean;
  onBbox: (bbox: Bbox) => void;
  onDrawingEnd: () => void;
  stroke: string;
}) {
  const map = useMap();
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);

  useEffect(() => {
    const container = map.getContainer();
    if (enabled) {
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      container.classList.add("map-drawing");
    } else {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      container.classList.remove("map-drawing");
      setStart(null);
      setEnd(null);
    }
    return () => {
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      container.classList.remove("map-drawing");
    };
  }, [enabled, map]);

  useMapEvents({
    mousedown(e) {
      if (!enabled) return;
      const p: [number, number] = [e.latlng.lat, e.latlng.lng];
      setStart(p);
      setEnd(p);
    },
    mousemove(e) {
      if (!enabled || !start) return;
      setEnd([e.latlng.lat, e.latlng.lng]);
    },
    mouseup() {
      if (!enabled || !start || !end) return;
      // A click without a drag is not a selection.
      if (start[0] === end[0] && start[1] === end[1]) {
        setStart(null);
        setEnd(null);
        return;
      }
      onBbox(roundBbox(normaliseBbox(start, end)));
      onDrawingEnd();
      setStart(null);
      setEnd(null);
    },
  });

  if (!start || !end) return null;
  const b = normaliseBbox(start, end);
  return (
    <Rectangle
      bounds={
        [
          [b.minLat, b.minLng],
          [b.maxLat, b.maxLng],
        ] as LatLngBoundsExpression
      }
      pathOptions={{
        color: stroke,
        weight: 2,
        dashArray: "6 4",
        fillColor: stroke,
        fillOpacity: 0.12,
      }}
    />
  );
}

function MapHandle({ onReady }: { onReady: (map: LeafletMap) => void }) {
  const map = useMap();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    onReady(map);
  }, [map, onReady]);

  /*
   * Leaflet measures its container once, at construction. Here the container is
   * absolutely positioned and the panels around it lay out afterwards, so that
   * first measurement comes back too small and the tile grid is built to fit a
   * viewport that no longer exists - one tile against a mostly empty map. Poking
   * it after mount fixes the initial render, and the observer keeps it right
   * when the window is resized.
   */
  useEffect(() => {
    map.invalidateSize();
    const raf = requestAnimationFrame(() => map.invalidateSize());

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export function MapCanvas({
  layer,
  bbox,
  drawing,
  onBbox,
  onDrawingEnd,
  onMapReady,
}: Props) {
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!bbox) return null;
    return [
      [bbox.minLat, bbox.minLng],
      [bbox.maxLat, bbox.maxLng],
    ];
  }, [bbox]);

  return (
    <MapContainer
      center={[43.7231, 10.3963]}
      zoom={17}
      maxZoom={21}
      zoomControl={false}
      /*
       * Leaflet gives its own panes explicit z-index values (tiles 200, shapes
       * 400, markers 600). Pinning the map to z-0 keeps that whole range inside
       * one stacking context, so the overlay above it cannot be painted over by
       * a tile - which is what made the panels vanish as soon as zooming filled
       * the viewport with tiles.
       */
      className="absolute inset-0 z-0 h-full w-full"
    >
      {/* Keying on the URL forces a fresh layer when the basemap or its key
          changes. Leaflet does not re-read these options on an existing layer. */}
      <TileLayer
        key={`${layer.key}|${layer.url}|${layer.attribution}`}
        url={layer.url}
        attribution={layer.attribution}
        className={layer.className}
        maxZoom={21}
        maxNativeZoom={19}
      />

      <MapHandle onReady={onMapReady} />

      <AreaDrawer
        enabled={drawing}
        onBbox={onBbox}
        onDrawingEnd={onDrawingEnd}
        stroke={layer.stroke}
      />

      {bounds && !drawing && (
        <Rectangle
          bounds={bounds}
          pathOptions={{
            color: layer.stroke,
            weight: 2,
            fillColor: layer.stroke,
            fillOpacity: 0.14,
          }}
        />
      )}
    </MapContainer>
  );
}
