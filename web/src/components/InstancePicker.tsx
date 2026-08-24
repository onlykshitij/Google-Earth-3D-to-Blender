import { useEffect, useRef, useState } from "react";
import type { Instance } from "../types";
import { instanceDetail, instanceLabel } from "../types";

/**
 * Choose which open Blender session an export goes to.
 *
 * Collapses to a plain label when only one session is connected, which is the
 * usual case, and becomes a dropdown as soon as there is a real choice.
 */
export function InstancePicker({
  instances,
  selectedId,
  onSelect,
  connected,
}: {
  instances: Instance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  connected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const online = instances.filter((i) => i.online);
  const selected = online.find((i) => i.id === selectedId) ?? null;

  if (!connected) {
    return (
      <span className="flex items-center gap-1.5 border-l border-white/10 pl-2.5 text-[11px]">
        <span className="size-2 animate-pulse rounded-full bg-[var(--color-bad)]" />
        <span className="text-ink-400">hub unreachable</span>
      </span>
    );
  }

  if (online.length === 0) {
    return (
      <span className="flex items-center gap-1.5 border-l border-white/10 pl-2.5 text-[11px]">
        <span className="size-2 rounded-full bg-[var(--color-warn)]" />
        <span className="text-ink-400">no Blender connected</span>
      </span>
    );
  }

  return (
    <div ref={boxRef} className="relative border-l border-white/10 pl-2.5">
      <button
        onClick={() => online.length > 1 && setOpen((v) => !v)}
        className={`flex items-center gap-1.5 text-[11px] ${
          online.length > 1 ? "cursor-pointer" : "cursor-default"
        }`}
        title={selected ? instanceDetail(selected) : ""}
      >
        <span className="size-2 rounded-full bg-[var(--color-good)]" />
        <span className="max-w-[12rem] truncate text-ink-300">
          {selected ? instanceLabel(selected) : "pick a Blender"}
        </span>
        {online.length > 1 && (
          <>
            <span className="rounded bg-white/10 px-1 text-[10px] text-ink-300">
              {online.length}
            </span>
            <svg
              className={`size-3 text-ink-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </>
        )}
      </button>

      {open && online.length > 1 && (
        <div className="panel absolute top-full left-0 z-10 mt-2 w-72 p-1">
          <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-ink-400">
            Export to
          </p>
          {online.map((instance) => {
            const busy = instance.state?.busy;
            return (
              <button
                key={instance.id}
                onClick={() => {
                  onSelect(instance.id);
                  setOpen(false);
                }}
                className={`block w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.06] ${
                  instance.id === selectedId ? "bg-white/[0.08]" : ""
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm text-ink-200">
                    {instanceLabel(instance)}
                  </span>
                  {instance.info?.hosting && (
                    <span className="chip !px-1.5 !py-0 !text-[9px]">host</span>
                  )}
                  {busy && (
                    <span className="ml-auto text-[10px] text-accent">busy</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-ink-400">
                  {instanceDetail(instance)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
