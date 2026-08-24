import type { Bbox, ExportOptions, Instance, Listing, Session } from "./types";

/**
 * Client for the hub.
 *
 * The page is served by the hub itself, so every request is same-origin and
 * needs no CORS arrangement. The session token exists for the opposite case: a
 * page on some other origin can still POST here, but cannot read this API's
 * responses, so it can never learn the token and its writes are rejected.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Unexpected reply from the hub (${res.status})`);
  }

  if (!res.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export function getSession() {
  return request<Session>("api/session");
}

export function getInstances() {
  return request<{ instances: Instance[] }>("api/instances");
}

export function startExport(
  token: string,
  instanceId: string,
  bbox: Bbox,
  options: ExportOptions,
) {
  return request<{ accepted: boolean; instanceId: string }>("api/export", {
    method: "POST",
    body: JSON.stringify({ token, instanceId, bbox, options }),
  });
}

/**
 * List folders on the machine running the chosen Blender.
 *
 * The browser cannot see that filesystem - it may not even be the same machine
 * - so the hub relays the question to the agent and waits for its answer.
 */
export function browse(token: string, instanceId: string, path: string) {
  return request<Listing>("api/browse", {
    method: "POST",
    body: JSON.stringify({ token, instanceId, path }),
  });
}

/**
 * Run the last export again, unchanged.
 *
 * Tiles are fetched afresh, which is what recovers textures that failed to
 * arrive the first time.
 */
export function retryExport(
  token: string,
  instanceId: string,
  options: ExportOptions,
) {
  return request<{ accepted: boolean }>("api/retry", {
    method: "POST",
    body: JSON.stringify({ token, instanceId, options }),
  });
}

export function cancelExport(token: string, instanceId: string) {
  return request<{ cancelled: boolean }>("api/cancel", {
    method: "POST",
    body: JSON.stringify({ token, instanceId }),
  });
}
