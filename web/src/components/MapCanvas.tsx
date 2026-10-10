import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Polygon,
  Rectangle,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { point } from "leaflet";
import type { LatLngBoundsExpression, Map as LeafletMap, Point } from "leaflet";
// Patches Leaflet's map in place to add rotation. It reaches Leaflet through
// the global L, which Leaflet 1.9 always sets, so it must load after it - as
// it does here, below react-leaflet's own import of Leaflet.
import "leaflet-rotate";
import type { Bbox, Corner, MapSettings } from "../types";
import { settleBearing } from "./RotationDial";

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
  /** Set when the area is tilted; then it is drawn instead of the bbox. */
  corners: Corner[] | null;
  drawing: boolean;
  /** A drawn box, as four corners in screen order, starting top left. */
  onCorners: (corners: Corner[]) => void;
  onDrawingEnd: () => void;
  onMapReady: (map: LeafletMap) => void;
  /** The map's rotation in degrees, clockwise, whenever it changes. */
  onBearing: (degrees: number) => void;
};

/**
 * The ground corners of a screen-aligned rectangle between two container
 * points, starting top left and going clockwise.
 *
 * On a rotated map the screen's axes are not north and east, so the result is
 * a tilted rectangle on the ground. Leaflet-rotate makes
 * containerPointToLatLng account for the rotation.
 */
export function screenRectCorners(
  map: LeafletMap,
  a: Point,
  b: Point,
): Corner[] {
  const x0 = Math.min(a.x, b.x);
  const x1 = Math.max(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const y1 = Math.max(a.y, b.y);
  return (
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ] as [number, number][]
  ).map(([x, y]) => {
    const ll = map.containerPointToLatLng(point(x, y));
    return [ll.lat, ll.lng];
  });
}

/**
 * Drag out a rectangle.
 *
 * The rectangle follows the screen, so on a rotated map it comes out tilted on
 * the ground, lined up with whatever the map was turned to face. Map panning is
 * suspended while drawing, otherwise the same drag would both draw the box and
 * slide the map underneath it.
 */
function AreaDrawer({
  enabled,
  onCorners,
  onDrawingEnd,
  stroke,
}: {
  enabled: boolean;
  onCorners: (corners: Corner[]) => void;
  onDrawingEnd: () => void;
  stroke: string;
}) {
  const map = useMap();
  // Screen positions, so the box stays square to the screen however the map
  // is turned.
  const [start, setStart] = useState<Point | null>(null);
  const [end, setEnd] = useState<Point | null>(null);

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
      setStart(e.containerPoint);
      setEnd(e.containerPoint);
    },
    mousemove(e) {
      if (!enabled || !start) return;
      setEnd(e.containerPoint);
    },
    mouseup() {
      if (!enabled || !start || !end) return;
      // A click without a drag is not a selection.
      if (start.x === end.x || start.y === end.y) {
        setStart(null);
        setEnd(null);
        return;
      }
      onCorners(screenRectCorners(map, start, end));
      onDrawingEnd();
      setStart(null);
      setEnd(null);
    },
  });

  if (!start || !end) return null;
  return (
    <Polygon
      positions={screenRectCorners(map, start, end)}
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

function MapHandle({
  onReady,
  onBearing,
}: {
  onReady: (map: LeafletMap) => void;
  onBearing: (degrees: number) => void;
}) {
  const map = useMap();
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    onReady(map);
  }, [map, onReady]);

  // Rotation can come from the dial, Shift+scroll or a two-finger twist, so
  // the map's own event is the one place to hear about all of them.
  useEffect(() => {
    const report = () => onBearing(map.getBearing());
    map.on("rotate", report);
    return () => {
      map.off("rotate", report);
    };
  }, [map, onBearing]);

  /*
   * Shift + scroll turns the map. Leaflet-rotate has this built in, but it
   * reads only the vertical scroll, and browsers report Shift + scroll as
   * horizontal, so it never turned. This reads either axis, scales a trackpad's
   * small steps down, and runs in the capture phase so Leaflet does not also
   * zoom.
   */
  useEffect(() => {
    const container = map.getContainer();
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      let delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;
      // Firefox can report lines or pages rather than pixels.
      if (e.deltaMode === 1) delta *= 33;
      else if (e.deltaMode === 2) delta *= 300;
      e.preventDefault();
      e.stopPropagation();
      // One mouse-wheel notch is about 100 pixels: 5 degrees.
      const step = Math.max(-5, Math.min(5, delta / 20));
      map.setBearing(map.getBearing() + step);
    };
    container.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [map]);

  /*
   * Ctrl + drag turns the map, as in Google Maps: grab it anywhere and twist it
   * around the centre, and it follows the cursor to any angle. Shift steps by
   * 15 degrees. Cmd works too, since Ctrl + click opens a menu on a Mac.
   *
   * The press is caught in the capture phase and stopped there, so neither
   * Leaflet's panning nor the area drawer sees it.
   */
  useEffect(() => {
    const container = map.getContainer();
    let twist: { cx: number; cy: number; startAngle: number; startBearing: number } | null =
      null;

    const angleAt = (x: number, y: number) =>
      (Math.atan2(y - twist!.cy, x - twist!.cx) * 180) / Math.PI;

    const onMove = (e: MouseEvent) => {
      if (!twist) return;
      e.preventDefault();
      map.setBearing(
        settleBearing(
          twist.startBearing + angleAt(e.clientX, e.clientY) - twist.startAngle,
          e.shiftKey,
        ),
      );
    };
    const onUp = () => {
      twist = null;
      container.classList.remove("map-rotating");
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = container.getBoundingClientRect();
      twist = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        startAngle: 0,
        startBearing: map.getBearing(),
      };
      twist.startAngle = angleAt(e.clientX, e.clientY);
      container.classList.add("map-rotating");
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };

    container.addEventListener("mousedown", onDown, { capture: true });
    return () => {
      container.removeEventListener("mousedown", onDown, { capture: true });
      onUp();
    };
  }, [map]);

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
  corners,
  drawing,
  onCorners,
  onDrawingEnd,
  onMapReady,
  onBearing,
}: Props) {
  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!bbox) return null;
    return [
      [bbox.minLat, bbox.minLng],
      [bbox.maxLat, bbox.maxLng],
    ];
  }, [bbox]);

  const selectionStyle = {
    color: layer.stroke,
    weight: 2,
    fillColor: layer.stroke,
    fillOpacity: 0.14,
  };

  return (
    <MapContainer
      center={[43.7231, 10.3963]}
      zoom={17}
      maxZoom={21}
      zoomControl={false}
      // Rotation comes from leaflet-rotate. Its own compass control is left
      // off in favour of the dial in the overlay, its Shift + scroll handler
      // is replaced by one in MapHandle, and the device compass is never
      // followed: the map turns only when asked.
      rotate
      bearing={0}
      rotateControl={false}
      touchRotate
      shiftKeyRotate={false}
      compassBearing={false}
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

      <MapHandle onReady={onMapReady} onBearing={onBearing} />

      <AreaDrawer
        enabled={drawing}
        onCorners={onCorners}
        onDrawingEnd={onDrawingEnd}
        stroke={layer.stroke}
      />

      {!drawing && corners && (
        <Polygon positions={corners} pathOptions={selectionStyle} />
      )}
      {!drawing && !corners && bounds && (
        <Rectangle bounds={bounds} pathOptions={selectionStyle} />
      )}
    </MapContainer>
  );
}
