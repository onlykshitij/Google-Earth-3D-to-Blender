import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import type { MapSettings } from "../types";
import {
  clean,
  DEFAULT_GEOCODER,
  OVERPASS_SERVERS,
  SRTM_SOURCES,
} from "../lib/settings";
import { isTileUrl } from "./MapCanvas";

/** Show the end of a key, so it can be recognised without being read out. */
function tail(value: string): string {
  return value.length > 4 ? `…${value.slice(-4)}` : "set";
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  problem,
  inputRef,
}: {
  label: string;
  hint: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  problem?: string | null;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        ref={inputRef}
        className="input mt-1 font-mono text-[12px]"
        value={value}
        spellCheck={false}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {problem ? (
        <span className="mt-1 block text-[11px] leading-snug text-[#f7d78a]">
          {problem}
        </span>
      ) : (
        <span className="mt-1 block text-[11px] leading-snug text-ink-400">
          {hint}
        </span>
      )}
    </label>
  );
}

/**
 * Pick one of the built-in servers, or type another. An empty value means the
 * hub's choice, or the built-in order when the hub has none.
 */
function ServerChoice({
  label,
  hint,
  value,
  onChange,
  presets,
  hubValue,
  placeholder,
  problem,
}: {
  label: string;
  hint: ReactNode;
  value: string;
  onChange: (v: string) => void;
  presets: { label: string; url: string }[];
  hubValue: string | undefined;
  placeholder: string;
  problem: string | null;
}) {
  const known = (v: string) => !v || presets.some((p) => p.url === v);
  const [custom, setCustom] = useState(!known(value));
  const hubLabel = hubValue
    ? `The hub's choice (${presets.find((p) => p.url === hubValue)?.label ?? hubValue})`
    : `Automatic (${presets[0].label} first)`;

  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select
        className="input mt-1"
        value={custom ? "custom" : value}
        onChange={(e) => {
          const picked = e.target.value;
          setCustom(picked === "custom");
          onChange(picked === "custom" ? (known(value) ? "" : value) : picked);
        }}
      >
        <option value="">{hubLabel}</option>
        {presets.map((p) => (
          <option key={p.url} value={p.url}>
            {p.label}
          </option>
        ))}
        <option value="custom">Another address…</option>
      </select>
      {custom && (
        <input
          className="input mt-1 font-mono text-[12px]"
          value={value}
          spellCheck={false}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <span
        className={`mt-1 block text-[11px] leading-snug ${
          problem ? "text-[#f7d78a]" : "text-ink-400"
        }`}
      >
        {problem ?? hint}
      </span>
    </label>
  );
}

/**
 * Keys and addresses for the map and the search box.
 *
 * What is saved here stays in this browser and overrides the hub's own
 * GMEB_* defaults. An empty field falls back to the hub's value.
 */
export function SettingsDialog({
  hub,
  local,
  storageWorks,
  onSave,
  onClose,
}: {
  hub: Partial<MapSettings>;
  local: Partial<MapSettings>;
  storageWorks: boolean;
  onSave: (next: Partial<MapSettings>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<MapSettings>({
    cartoKey: local.cartoKey ?? "",
    tileUrl: local.tileUrl ?? "",
    tileAttribution: local.tileAttribution ?? "",
    geocoderUrl: local.geocoderUrl ?? "",
    overpassUrl: local.overpassUrl ?? "",
    srtmUrl: local.srtmUrl ?? "",
  });
  const firstField = useRef<HTMLInputElement>(null);
  // The app re-renders on every instance poll and passes a new onClose each
  // time. Reading it through a ref keeps the effect below to one run, so focus
  // is set once on opening instead of jumping back to the first field.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const set = (name: keyof MapSettings) => (value: string) =>
    setDraft((prev) => ({ ...prev, [name]: value }));

  const hubSettings = clean(hub);

  const tileProblem =
    draft.tileUrl.trim() && !isTileUrl(draft.tileUrl)
      ? "Needs to start with https:// and contain {z}, {x} and {y}."
      : null;
  const geocoderProblem =
    draft.geocoderUrl.trim() && !/^https?:\/\/\S+$/i.test(draft.geocoderUrl.trim())
      ? "Needs to start with https://."
      : null;

  const httpProblem = (v: string) =>
    v.trim() && !/^https?:\/\/\S+$/i.test(v.trim()) ? "Needs to start with https://." : null;
  const overpassProblem = httpProblem(draft.overpassUrl);
  const srtmProblem =
    httpProblem(draft.srtmUrl) ??
    (draft.srtmUrl.trim() && !draft.srtmUrl.includes("{tile}")
      ? "Needs {tile} where the tile name goes."
      : null);
  const problems = Boolean(tileProblem || geocoderProblem || overpassProblem || srtmProblem);

  const save = () => {
    if (problems) return;
    onSave(clean(draft));
  };

  // Rendered into <body>, for the same reason as FolderPicker: a
  // backdrop-filter ancestor would otherwise trap position:fixed.
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="panel flex max-h-full w-[34rem] max-w-full flex-col overflow-hidden p-0"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="min-w-0">
            <h2 id="settings-title" className="text-sm font-semibold text-ink-200">
              Map settings
            </h2>
            <p className="text-[11px] text-ink-400">
              Keys and servers for the map, search and data sources. Exports need no key.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Field
            inputRef={firstField}
            label="CARTO basemaps key"
            value={draft.cartoKey}
            onChange={set("cartoKey")}
            placeholder={
              hubSettings.cartoKey
                ? `Using the hub's key (${tail(hubSettings.cartoKey)})`
                : "Not set"
            }
            hint={
              <>
                Turns on CARTO's Dark and Light layers. Without it, Dark uses
                OpenStreetMap tiles shaded dark and Light is hidden. Free from{" "}
                <a
                  href="https://carto.com/basemaps/apikey"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent hover:text-accent-bright"
                >
                  carto.com/basemaps/apikey
                </a>
                .
              </>
            }
          />

          <Field
            label="Custom tile layer"
            value={draft.tileUrl}
            onChange={set("tileUrl")}
            problem={tileProblem}
            placeholder={
              hubSettings.tileUrl || "https://…/{z}/{x}/{y}.png?key=YOUR_KEY"
            }
            hint="Adds a Custom button to the layer switcher. Any XYZ tile address works, for example MapTiler, Stadia or Thunderforest with your key in it."
          />

          <Field
            label="Custom tile attribution"
            value={draft.tileAttribution}
            onChange={set("tileAttribution")}
            placeholder={
              hubSettings.tileAttribution || "© MapTiler © OpenStreetMap contributors"
            }
            hint="The credit the tile provider asks for. Shown as plain text."
          />

          <Field
            label="Search address"
            value={draft.geocoderUrl}
            onChange={set("geocoderUrl")}
            problem={geocoderProblem}
            placeholder={hubSettings.geocoderUrl || DEFAULT_GEOCODER}
            hint="A Nominatim-compatible search, such as your own Nominatim or LocationIQ. {query} is replaced by what you type."
          />

          <ServerChoice
            label="OpenStreetMap buildings server"
            value={draft.overpassUrl}
            onChange={set("overpassUrl")}
            presets={OVERPASS_SERVERS}
            hubValue={hubSettings.overpassUrl}
            placeholder="https://…/api/interpreter"
            problem={overpassProblem}
            hint="The Overpass server Blender asks for OSM buildings. If it is busy, the others are tried in turn."
          />

          <ServerChoice
            label="SRTM terrain source"
            value={draft.srtmUrl}
            onChange={set("srtmUrl")}
            presets={SRTM_SOURCES}
            hubValue={hubSettings.srtmUrl}
            placeholder="https://…/{tile}.hgt.zip"
            problem={srtmProblem}
            hint="Where Blender downloads elevation tiles; each is kept after the first download. If one has no tile, the other is tried. An address of your own uses {tile} (N43E010) and {lat} (N43)."
          />
        </div>

        <div className="border-t border-white/8 p-3">
          <p className="mb-2 text-[11px] leading-snug text-ink-400">
            {storageWorks
              ? "Saved in this browser only, and used instead of the hub's values. Empty fields use the hub's. To set them for every browser, use the GMEB_* variables on the hub."
              : "This browser blocks site storage, so these will last until the page is reloaded. To keep them, use the GMEB_* variables on the hub."}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => onSave({})}
              className="btn-ghost"
              title="Forget this browser's values and use the hub's"
            >
              Reset
            </button>
            <span className="flex-1" />
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={problems}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
