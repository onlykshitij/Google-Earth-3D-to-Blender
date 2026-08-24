import { useState } from "react";
import type { Bbox, ExportOptions, Instance, Job } from "../types";
import { instanceLabel } from "../types";
import {
  bboxSize,
  bboxToText,
  estimateCost,
  formatMetres,
  isEmpty,
} from "../lib/geo";
import { Card, NumberField, Slider, Stat, Toggle } from "./ui";
import { ProgressCard } from "./ProgressCard";

type Props = {
  instance: Instance | null;
  onlineCount: number;
  hubConnected: boolean;
  bbox: Bbox | null;
  setBbox: (b: Bbox) => void;
  options: ExportOptions;
  setOptions: (patch: Partial<ExportOptions>) => void;
  drawing: boolean;
  setDrawing: (v: boolean) => void;
  onUseCurrentView: () => void;
  job: Job | null;
  busy: boolean;
  error: string | null;
  onExport: () => void;
  onCancel: () => void;
};

export function Sidebar(props: Props) {
  const { bbox, options, setOptions, job, instance } = props;
  const cost = estimateCost(bbox);
  const hasArea = bbox !== null && !isEmpty(bbox);
  const size = hasArea ? bboxSize(bbox!) : null;
  const [showFields, setShowFields] = useState(false);

  const info = instance?.info ?? {};
  const blocked = props.busy || !hasArea || !instance;

  return (
    <aside className="pointer-events-auto flex h-full w-[24rem] shrink-0 flex-col gap-2 overflow-y-auto p-3">
      {/* --- area ---------------------------------------------------------- */}
      <Card
        title="Area"
        action={
          hasArea ? (
            <button
              onClick={() =>
                navigator.clipboard?.writeText(bboxToText(bbox!))
              }
              className="text-[11px] text-ink-400 transition hover:text-accent"
            >
              Copy
            </button>
          ) : undefined
        }
      >
        <div className="flex gap-1.5">
          <button
            onClick={() => props.setDrawing(!props.drawing)}
            className={props.drawing ? "btn-primary flex-1" : "btn-ghost flex-1"}
          >
            {props.drawing
              ? "Drag on the map…"
              : hasArea
                ? "Redraw area"
                : "Draw area"}
          </button>
          <button onClick={props.onUseCurrentView} className="btn-ghost">
            Use view
          </button>
        </div>

        {!hasArea && (
          <p className="mt-2 text-xs leading-snug text-ink-400">
            Drag a rectangle over the map to mark the area to bring in, or press{" "}
            <em>Use view</em> to take what is currently on screen.
          </p>
        )}

        {hasArea && size && (
          <>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Stat
                label="Ground size"
                value={`${formatMetres(size.width)} × ${formatMetres(size.height)}`}
              />
              <Stat
                label="Area"
                value={`${((size.width * size.height) / 1e6).toFixed(3)} km²`}
              />
            </div>

            {cost && (
              <div
                className={`mt-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${
                  cost.severity === "ok"
                    ? "border-white/8 bg-white/[0.03] text-ink-400"
                    : cost.severity === "warn"
                      ? "border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[#f7d78a]"
                      : "border-[var(--color-bad)]/30 bg-[var(--color-bad)]/10 text-[#ffb3b3]"
                }`}
              >
                <strong className="font-medium">{cost.label}</strong> —{" "}
                {cost.detail}. The exporter probes{" "}
                {cost.probes.toLocaleString()} points across this area.
              </div>
            )}

            <button
              onClick={() => setShowFields((v) => !v)}
              className="mt-1.5 w-full text-left text-[11px] text-ink-400 transition hover:text-accent"
            >
              {showFields ? "Hide coordinates" : "Fine-tune coordinates"}
            </button>

            {showFields && (
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <NumberField
                  label="Min Lat"
                  value={bbox!.minLat}
                  onChange={(v) => props.setBbox({ ...bbox!, minLat: v })}
                />
                <NumberField
                  label="Max Lat"
                  value={bbox!.maxLat}
                  onChange={(v) => props.setBbox({ ...bbox!, maxLat: v })}
                />
                <NumberField
                  label="Min Lng"
                  value={bbox!.minLng}
                  onChange={(v) => props.setBbox({ ...bbox!, minLng: v })}
                />
                <NumberField
                  label="Max Lng"
                  value={bbox!.maxLng}
                  onChange={(v) => props.setBbox({ ...bbox!, maxLng: v })}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* --- detail -------------------------------------------------------- */}
      <Card title="Detail">
        <Slider
          label="Octant level"
          value={options.level}
          onChange={(v) => setOptions({ level: v })}
          min={14}
          max={21}
          format={(v) => `${v}`}
        />
        <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
          20 is Google's finest level in most cities. Each step down roughly
          quarters the download and the vertex count.
        </p>
      </Card>

      {/* --- orientation --------------------------------------------------- */}
      <Card title="Orientation">
        <Toggle
          label="Level the ground"
          hint="Rotate the fitted ground plane flat and sit it at Z=0. Terrain relief is kept; only the overall tilt is removed."
          checked={options.levelGround}
          onChange={(v) => setOptions({ levelGround: v })}
        />
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <NumberField
            label="Ground cell"
            value={options.groundCellSize}
            onChange={(v) => setOptions({ groundCellSize: v })}
            step={0.5}
            min={0.5}
            max={50}
            suffix="m"
            disabled={!options.levelGround}
          />
          <NumberField
            label="Unit scale"
            value={options.scale}
            onChange={(v) => setOptions({ scale: v })}
            step={0.01}
            min={0.0001}
          />
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
          Scale 1.0 makes one Blender unit one metre. The model always arrives
          Z-up with +Y pointing north.
        </p>

        <div className="mt-2 border-t border-white/8 pt-1.5">
          <Toggle
            label="Trim below ground"
            hint="Google's tiles include a flat sheet tens of metres under the terrain. This drops it - along with any genuinely sunken ground."
            checked={options.trimSubGround}
            onChange={(v) => setOptions({ trimSubGround: v })}
            disabled={!options.levelGround}
          />
          {options.trimSubGround && options.levelGround && (
            <div className="mt-1 w-1/2">
              <NumberField
                label="Cut depth"
                value={options.trimDepth}
                onChange={(v) => setOptions({ trimDepth: v })}
                step={0.5}
                min={0.1}
                suffix="m"
              />
            </div>
          )}
        </div>
      </Card>

      {/* --- files --------------------------------------------------------- */}
      <Card title="Files">
        <label className="block">
          <span className="field-label">Export folder</span>
          <input
            className="input mt-1"
            placeholder="temporary download cache"
            value={options.exportDir}
            onChange={(e) => setOptions({ exportDir: e.target.value })}
            spellCheck={false}
          />
        </label>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-400">
          {options.exportDir.trim() ? (
            <>
              The tiles are downloaded here and imported from here. Each export
              gets its own dated subfolder holding the model, its material file
              and its textures.
            </>
          ) : (
            <>
              Left empty, downloads go to a temporary cache. Set a folder to
              keep the files somewhere you choose — a path on the machine
              running Blender, which you can also pick in Blender's own Files
              panel.
            </>
          )}
        </p>
      </Card>

      {/* --- scene --------------------------------------------------------- */}
      <Card title="Scene">
        <label className="block">
          <span className="field-label">Collection</span>
          <input
            className="input mt-1"
            placeholder="named after the coordinates"
            value={options.collectionName}
            onChange={(e) => setOptions({ collectionName: e.target.value })}
          />
        </label>

        <div className="mt-1">
          <Toggle
            label="Replace previous import"
            checked={options.replacePrevious}
            onChange={(v) => setOptions({ replacePrevious: v })}
          />
          <Toggle
            label="Lock in place"
            hint="Makes the reference unselectable so it cannot be nudged."
            checked={options.lockReference}
            onChange={(v) => setOptions({ lockReference: v })}
          />
          <Toggle
            label="Join into one object"
            checked={options.joinObjects}
            onChange={(v) => setOptions({ joinObjects: v })}
          />
          <Toggle
            label="Smooth shading"
            checked={options.shadeSmooth}
            onChange={(v) => setOptions({ shadeSmooth: v })}
          />
          <Toggle
            label="Fit view clipping"
            checked={options.adjustClipping}
            onChange={(v) => setOptions({ adjustClipping: v })}
          />
        </div>
      </Card>

      {/* --- export -------------------------------------------------------- */}
      {/* The footer sticks, so it needs its own ground: the cards are
          translucent, and without this the panel scrolling underneath shows
          through and reads as a rendering glitch. */}
      <div className="sticky bottom-0 -mx-3 mt-auto flex flex-col gap-2 border-t border-white/8 bg-ink-950 px-3 pt-3 pb-1">
        {!props.hubConnected && (
          <p className="panel border-[var(--color-bad)]/40 px-3 py-2 text-xs leading-snug text-[#ffb3b3]">
            Lost the connection to the hub. If it was hosted inside Blender,
            that Blender has probably closed.
          </p>
        )}

        {props.hubConnected && props.onlineCount === 0 && (
          <p className="panel border-[var(--color-warn)]/40 px-3 py-2 text-xs leading-snug text-[#f7d78a]">
            No Blender is connected. Open Blender with the Google Map Export Bridge
            add-on enabled — it will appear here within a couple of seconds.
          </p>
        )}

        {props.error && (
          <p className="panel border-[var(--color-bad)]/40 px-3 py-2 text-xs leading-snug text-[#ffb3b3]">
            {props.error}
          </p>
        )}

        {instance && info.nodeFound === false && (
          <p className="panel border-[var(--color-warn)]/40 px-3 py-2 text-xs leading-snug text-[#f7d78a]">
            Node.js was not found on that machine. Install it from nodejs.org,
            then set the path in the add-on preferences.
          </p>
        )}

        {instance && info.onlineAccess === false && (
          <p className="panel border-[var(--color-warn)]/40 px-3 py-2 text-xs leading-snug text-[#f7d78a]">
            That Blender is in offline mode. Enable Preferences → System →
            Network → Allow Online Access to download tiles.
          </p>
        )}

        {job && <ProgressCard job={job} onCancel={props.onCancel} />}

        <button
          onClick={props.onExport}
          disabled={blocked}
          className="btn-primary w-full py-3 text-[15px]"
        >
          {props.busy
            ? "Working…"
            : instance
              ? `Export to ${instanceLabel(instance)}`
              : "Export to Blender"}
        </button>
      </div>
    </aside>
  );
}
