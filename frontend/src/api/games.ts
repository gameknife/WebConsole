// Imperative game-mutation calls (metadata edit + cover upload).

import { apiGet, ApiError } from './client';
import type { Game } from './types';

const API_BASE = '/api/v1';

/** Editable metadata fields; omitted fields are left unchanged. */
export interface MetadataPatch {
  name?: string;
  nameCn?: string;
  description?: string;
  tags?: string[];
}

/** Patches a game's metadata. */
export async function updateMetadata(id: string, patch: MetadataPatch): Promise<Game> {
  const res = await fetch(`${API_BASE}/games/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.code ?? 'http_error', body?.error?.message ?? res.statusText, res.status);
  }
  return body.data as Game;
}

/** Uploads a cover image for a game. */
export async function uploadCover(id: string, file: File): Promise<Game> {
  const form = new FormData();
  form.append('cover', file);
  const res = await fetch(`${API_BASE}/games/${id}/cover`, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.code ?? 'http_error', body?.error?.message ?? res.statusText, res.status);
  }
  return body.data as Game;
}

// Re-export for convenience where a fetch of a single game is needed.
export const fetchGame = (id: string) => apiGet<Game>(`/games/${id}`);
