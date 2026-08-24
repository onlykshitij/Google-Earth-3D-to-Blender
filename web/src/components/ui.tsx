import type { ReactNode } from "react";

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel p-3">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-300">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 0.0001,
  min,
  max,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <div className="relative mt-1">
        <input
          type="number"
          className="input"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-2.5 py-1.5 ${
        disabled ? "opacity-40" : "cursor-pointer"
      }`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`mt-0.5 h-4 w-7 shrink-0 rounded-full border transition ${
          checked
            ? "border-accent/60 bg-accent/80"
            : "border-white/15 bg-white/[0.06]"
        }`}
      >
        <span
          className={`block size-3 rounded-full bg-white transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm leading-tight text-ink-200">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[11px] leading-snug text-ink-400">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="field-label">{label}</span>
        <span className="numeric text-xs text-ink-300">
          {format ? format(value) : value}
        </span>
      </span>
      <input
        type="range"
        className="mt-1.5 w-full accent-[var(--color-accent)]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="numeric mt-0.5 text-sm text-ink-200">{value}</div>
    </div>
  );
}
