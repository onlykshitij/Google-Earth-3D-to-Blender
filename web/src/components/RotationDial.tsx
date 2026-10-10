import { useRef } from "react";

/** Fold any angle into -180..180, which reads better than 0..360. */
export function signedDegrees(deg: number): number {
  const folded = ((((deg + 180) % 360) + 360) % 360) - 180;
  return folded === -180 ? 180 : folded;
}

/** Within this many degrees of north, a drag lets go at exactly north. */
const NORTH_SNAP = 1.5;

/**
 * Tidy a bearing reached by dragging: half-degree steps, or 15-degree steps
 * when `coarse` (Shift is held), and exactly north when close to it.
 */
export function settleBearing(degrees: number, coarse: boolean): number {
  const next = coarse
    ? Math.round(degrees / 15) * 15
    : Math.round(degrees * 2) / 2;
  return Math.abs(signedDegrees(next)) < NORTH_SNAP ? 0 : next;
}
/** A press that moves less than this many pixels is a click. */
const CLICK_SLOP = 3;

/**
 * Turn the map.
 *
 * Drag around the dial to rotate, holding Shift to step by 15 degrees. A click
 * turns north back up. With the dial focused, the arrow keys rotate by one
 * degree (15 with Shift) and Home faces north. The needle points at north.
 *
 * The map itself turns with Ctrl + drag and Shift + scroll, handled in
 * MapCanvas; this dial follows whatever the map reports.
 */
export function RotationDial({
  bearing,
  onChange,
  onNudge,
}: {
  /** The map's rotation in degrees, clockwise. */
  bearing: number;
  onChange: (degrees: number) => void;
  /**
   * Turn by `degrees` from wherever the map is now. Key repeat can outrun
   * re-rendering, so steps are applied to the map's live bearing rather than
   * to the `bearing` this dial last rendered with.
   */
  onNudge: (degrees: number) => void;
}) {
  const drag = useRef<{
    centreX: number;
    centreY: number;
    startAngle: number;
    startBearing: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  const angleAt = (x: number, y: number) => {
    const d = drag.current!;
    return (Math.atan2(y - d.centreY, x - d.centreX) * 180) / Math.PI;
  };

  const shown = signedDegrees(bearing);
  const label =
    Math.abs(shown) < 0.05 ? "North up" : `${shown > 0 ? "+" : ""}${shown.toFixed(1)}°`;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        aria-label={`Map rotation: ${label}. Drag to rotate, click to face north.`}
        title={
          "Drag to rotate the map, Shift to step by 15°. Click to face north.\n" +
          "On the map: Ctrl + drag, or Shift + scroll. Arrow keys here."
        }
        className="relative size-9 touch-none select-none rounded-full border border-white/10 bg-white/[0.04] text-ink-300 transition hover:border-white/25 hover:text-ink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          drag.current = {
            centreX: rect.left + rect.width / 2,
            centreY: rect.top + rect.height / 2,
            startAngle: 0,
            startBearing: bearing,
            startX: e.clientX,
            startY: e.clientY,
            moved: false,
          };
          drag.current.startAngle = angleAt(e.clientX, e.clientY);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (
            !d.moved &&
            Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < CLICK_SLOP
          ) {
            return;
          }
          d.moved = true;
          // Relative to where the press started, so grabbing the dial anywhere
          // does not make the map jump.
          onChange(
            settleBearing(
              d.startBearing + (angleAt(e.clientX, e.clientY) - d.startAngle),
              e.shiftKey,
            ),
          );
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          e.currentTarget.releasePointerCapture(e.pointerId);
          if (d && !d.moved) onChange(0);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 15 : 1;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            onNudge(-step);
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            onNudge(step);
          } else if (e.key === "Home") {
            onChange(0);
          } else {
            return;
          }
          e.preventDefault();
        }}
      >
        <svg
          viewBox="0 0 36 36"
          className="absolute inset-0 size-full"
          style={{ transform: `rotate(${bearing}deg)` }}
          aria-hidden="true"
        >
          <path d="M18 5 L22 18 L14 18 Z" fill="#ff6b6b" />
          <path d="M18 31 L22 18 L14 18 Z" fill="currentColor" opacity="0.55" />
          <circle cx="18" cy="18" r="1.6" fill="#0a0c10" />
        </svg>
      </button>
      <span className="numeric text-[10px] leading-none text-ink-400">
        {Math.abs(shown) < 0.05 ? "N" : `${Math.round(shown)}°`}
      </span>
    </div>
  );
}
