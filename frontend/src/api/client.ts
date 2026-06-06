// Thin fetch wrapper that unwraps the backend's `{ data }` / `{ error }`
// envelope and throws a typed error on failure.

import type { ApiEnvelope } from './types';

/** Base path for the REST API. Same-origin in production; proxied in dev. */
const API_BASE = '/api/v1';

/** Error thrown when the API returns a non-2xx status or an error envelope. */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Performs a GET request and returns the unwrapped `data` payload. */
export async function apiGet<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const url = new URL(API_BASE + path, window.location.origin);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return request<T>(url.toString(), { method: 'GET' });
}

/** Performs a request with the given init and unwraps the envelope. */
async function request<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const err = (body as { error?: { code?: string; message?: string } }).error;
    throw new ApiError(err?.code ?? 'http_error', err?.message ?? res.statusText, res.status);
  }
  return (body as ApiEnvelope<T>).data;
}
