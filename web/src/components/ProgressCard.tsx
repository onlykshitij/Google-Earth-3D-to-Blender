import type { Job } from "../types";
import { TERMINAL_PHASES } from "../types";
import { Stat } from "./ui";

const PHASE_LABEL: Record<string, string> = {
  queued: "Queued",
  downloading: "Downloading tiles",
  converting: "Georeferencing",
  importing: "Importing into Blender",
  done: "Done",
  error: "Failed",
  cancelled: "Cancelled",
};

const STEPS = ["downloading", "converting", "importing"] as const;

export function ProgressCard({
  job,
  onCancel,
}: {
  job: Job;
  onCancel: () => void;
}) {
  const running = !TERMINAL_PHASES.includes(job.phase);
  const failed = job.phase === "error";
  const done = job.phase === "done";

  const activeStep = STEPS.indexOf(job.phase as (typeof STEPS)[number]);

  return (
    <section
      className={`panel p-3 ${
        failed
          ? "border-[var(--color-bad)]/40"
          : done
            ? "border-[var(--color-good)]/40"
            : ""
      }`}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-ink-200">
          {running && (
            <span className="size-3 animate-spin rounded-full border-2 border-ink-600 border-t-accent" />
          )}
          {done && <span className="text-[var(--color-good)]">✓</span>}
          {failed && <span className="text-[var(--color-bad)]">!</span>}
          {PHASE_LABEL[job.phase] ?? job.phase}
        </h2>
        <span className="numeric text-[11px] text-ink-400">
          {job.elapsed.toFixed(0)}s
        </span>
      </header>

      {running && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.max(2, job.progress * 100)}%` }}
            />
          </div>

          <div className="mt-2 flex gap-1">
            {STEPS.map((step, i) => (
              <div
                key={step}
                className={`h-0.5 flex-1 rounded-full ${
                  i <= activeStep ? "bg-accent/70" : "bg-white/10"
                }`}
              />
            ))}
          </div>
        </>
      )}

      <p className="mt-2 text-xs leading-snug text-ink-300">{job.message}</p>

      {failed && job.error && (
        <p className="mt-2 rounded-lg border border-[var(--color-bad)]/30 bg-[var(--color-bad)]/10 px-2.5 py-2 text-xs leading-snug text-[#ffb3b3]">
          {job.error}
        </p>
      )}

      {done && job.model && job.model.coverage !== "3d" && job.model.coverageNote && (
        <p
          className={`mt-2 rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${
            job.model.coverage === "flat"
              ? "border-[var(--color-bad)]/40 bg-[var(--color-bad)]/10 text-[#ffb3b3]"
              : "border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 text-[#f7d78a]"
          }`}
        >
          <strong className="font-medium">
            {job.model.coverage === "flat" ? "No 3D coverage" : "Thin coverage"}
          </strong>{" "}
          {job.model.coverageNote}
        </p>
      )}

      {done && job.model && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <Stat
              label="Footprint"
              value={`${Math.round(job.model.sizeX)} x ${Math.round(job.model.sizeY)} m`}
            />
            <Stat
              label="Vertices"
              value={job.model.vertices.toLocaleString()}
            />
            <Stat
              label="Tilt removed"
              value={`${job.model.tiltRemovedDeg.toFixed(2)}°`}
            />
            <Stat
              label="Height range"
              value={`${job.model.minZ.toFixed(0)} .. ${job.model.maxZ.toFixed(0)} m`}
            />
            <Stat label="Detail" value={`${job.model.density.toFixed(2)} v/m²`} />
            <Stat
              label="Octant level"
              value={
                job.model.achievedLevel
                  ? `${job.model.achievedLevel}${
                      job.level && job.model.achievedLevel < job.level
                        ? ` (asked ${job.level})`
                        : ""
                    }`
                  : "—"
              }
            />
          </div>

          <p className="mt-2 text-[11px] leading-snug text-ink-400">
            Ground fitted from {job.model.groundInliers} of{" "}
            {job.model.groundCells} cells, {job.model.groundRms.toFixed(2)} m
            rms. Lower rms means a more confident level.
          </p>

          {job.outputDir && (
            <div className="mt-2 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-ink-400">
                Written to
              </div>
              <div
                className="mt-0.5 break-all text-[11px] leading-snug text-ink-300"
                title={job.outputDir}
              >
                {job.outputDir}
              </div>
            </div>
          )}
        </>
      )}

      {running && (
        <button onClick={onCancel} className="btn-ghost mt-3 w-full">
          Cancel
        </button>
      )}

      {job.log.length > 0 && (
        <details className="mt-2 group">
          <summary className="cursor-pointer list-none text-[11px] text-ink-400 transition hover:text-ink-300">
            Log
          </summary>
          <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-ink-950/70 p-2 text-[10px] leading-relaxed text-ink-400">
            {job.log.slice(-25).join("\n")}
          </pre>
        </details>
      )}
    </section>
  );
}
