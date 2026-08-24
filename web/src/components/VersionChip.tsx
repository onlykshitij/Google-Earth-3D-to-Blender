import { useEffect, useState } from "react";

const REPO = "onlykshitij/Google-Earth-3D-to-Blender";
const RELEASES = `https://github.com/${REPO}/releases/latest`;
const API = `https://api.github.com/repos/${REPO}/releases/latest`;

const CACHE_KEY = "gmeb.updateCheck";
// GitHub allows 60 unauthenticated calls an hour per address, and a new release
// is not news that goes stale quickly, so this is checked rarely.
const CACHE_MS = 6 * 60 * 60 * 1000;

type Cached = { checkedAt: number; latest: string | null };

/** Compare dotted versions numerically: 1.10.0 is newer than 1.9.0. */
export function isNewer(candidate: string, current: string): boolean {
  const parts = (v: string) =>
    v.replace(/^v/, "").split(/[.\-+]/).map((n) => parseInt(n, 10));

  const a = parts(candidate);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number.isFinite(a[i]) ? a[i] : 0;
    const y = Number.isFinite(b[i]) ? b[i] : 0;
    if (x !== y) return x > y;
  }
  return false;
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Date.now() - parsed.checkedAt > CACHE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Show the running version, and whether a newer release exists.
 *
 * The check is made from the browser rather than the hub, so a hub with no
 * outbound access still works, and it fails silently: not knowing about an
 * update is never worth an error message.
 */
export function VersionChip({ version }: { version: string }) {
  const [latest, setLatest] = useState<string | null>(
    () => readCache()?.latest ?? null,
  );

  useEffect(() => {
    if (!version || readCache()) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(API, {
          signal: controller.signal,
          headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { tag_name?: string };
        const tag = (data.tag_name ?? "").replace(/^v/, "") || null;
        if (cancelled) return;
        setLatest(tag);
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ checkedAt: Date.now(), latest: tag } as Cached),
        );
      } catch {
        // Offline, rate-limited, or blocked. Stay quiet and try again later.
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [version]);

  if (!version) return null;

  const updateAvailable = latest !== null && isNewer(latest, version);

  if (!updateAvailable) {
    return (
      <span
        className="border-l border-white/10 pl-2.5 text-[11px] text-ink-500"
        title={`Google Map Export Bridge ${version}`}
      >
        v{version}
      </span>
    );
  }

  return (
    <a
      href={RELEASES}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-1.5 border-l border-white/10 pl-2.5 text-[11px] text-[#f7d78a] transition hover:text-[#ffe9b0]"
      title={`You are on ${version}. Version ${latest} is available — click for the release.`}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-warn)] opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-[var(--color-warn)]" />
      </span>
      v{version} → {latest}
    </a>
  );
}
