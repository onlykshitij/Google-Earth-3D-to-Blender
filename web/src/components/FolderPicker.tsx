import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as api from "../api";
import type { Listing } from "../types";

/**
 * Choose a folder on the machine running the chosen Blender.
 *
 * A browser cannot open a native picker for a filesystem it is not on, and with
 * a container or a remote hub that filesystem belongs to another machine
 * entirely. So the listing is fetched from the Blender side and navigated here.
 */
export function FolderPicker({
  token,
  instanceId,
  startPath,
  onPick,
  onClose,
}: {
  token: string;
  instanceId: string;
  startPath: string;
  onPick: (path: string) => void;
  onClose: () => void;
}) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  const load = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.browse(token, instanceId, path);
        setListing(result);
        setManual(result.path || "");
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [token, instanceId],
  );

  useEffect(() => {
    void load(startPath);
  }, [load, startPath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const current = listing?.path ?? "";

  // Rendered into <body>. The sidebar's cards use backdrop-filter, and any such
  // ancestor becomes the containing block for position:fixed, which would trap
  // this dialog inside a card instead of covering the window.
  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="panel flex h-[32rem] w-[36rem] flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-200">
              Choose an export folder
            </h2>
            <p className="truncate text-[11px] text-ink-400">
              On the machine running Blender
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Roots and the way back up. */}
        <div className="flex flex-wrap items-center gap-1 border-b border-white/8 px-3 py-2">
          <button
            onClick={() => listing?.parent && void load(listing.parent)}
            disabled={!listing?.parent}
            className="btn-ghost !px-2 !py-1 !text-[11px] disabled:opacity-30"
            title="Up one folder"
          >
            ↑ Up
          </button>
          {(listing?.roots ?? []).map((root) => (
            <button
              key={root.path}
              onClick={() => void load(root.path)}
              className="btn-ghost !px-2 !py-1 !text-[11px]"
            >
              {root.name}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {loading && (
            <p className="px-3 py-4 text-sm text-ink-400">Asking Blender…</p>
          )}

          {!loading && error && (
            <p className="m-2 rounded-lg border border-[var(--color-bad)]/40 bg-[var(--color-bad)]/10 px-3 py-2 text-xs leading-snug text-[#ffb3b3]">
              {error}
            </p>
          )}

          {!loading && listing?.error && (
            <p className="m-2 rounded-lg border border-[var(--color-warn)]/40 bg-[var(--color-warn)]/10 px-3 py-2 text-xs leading-snug text-[#f7d78a]">
              {listing.error}
            </p>
          )}

          {!loading && !error && listing && !listing.error && (
            <>
              {listing.entries.length === 0 && (
                <p className="px-3 py-4 text-sm text-ink-400">
                  No subfolders here. You can still choose this one.
                </p>
              )}
              {listing.entries.map((entry) => (
                <button
                  key={entry.path}
                  onDoubleClick={() => void load(entry.path)}
                  onClick={() => void load(entry.path)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-ink-300 transition hover:bg-white/[0.06] hover:text-ink-200"
                >
                  <svg
                    className="size-4 shrink-0 text-ink-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                  <span className="truncate">{entry.name}</span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="border-t border-white/8 p-3">
          <label className="block">
            <span className="field-label">Folder</span>
            <input
              className="input mt-1 font-mono text-[11px]"
              value={manual}
              spellCheck={false}
              placeholder="type or paste a path"
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(manual);
              }}
            />
          </label>

          {listing?.writable === false && (
            <p className="mt-1.5 text-[11px] text-[#f7d78a]">
              Blender cannot write here — pick somewhere else.
            </p>
          )}

          <div className="mt-2 flex gap-1.5">
            <button onClick={onClose} className="btn-ghost flex-1">
              Cancel
            </button>
            <button
              onClick={() => void load(manual)}
              className="btn-ghost"
              title="Open the typed path"
            >
              Go
            </button>
            <button
              onClick={() => onPick(manual || current)}
              disabled={!manual && !current}
              className="btn-primary flex-1"
            >
              Use this folder
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
