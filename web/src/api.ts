import type { Bbox, ExportOptions, Instance, Session } from "./types";

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

export function cancelExport(token: string, instanceId: string) {
  return request<{ cancelled: boolean }>("api/cancel", {
    method: "POST",
    body: JSON.stringify({ token, instanceId }),
  });
}
