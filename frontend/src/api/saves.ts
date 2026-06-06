// Save-state and play-history API calls. These sit alongside the React Query
// hooks but are imperative (invoked from the in-game menu / player lifecycle).

import { apiGet, ApiError } from './client';
import type { SaveSlot } from './types';

const API_BASE = '/api/v1';

/** Lists save slots for a game. */
export function listSaves(gameId: string): Promise<SaveSlot[]> {
  return apiGet<SaveSlot[]>(`/saves/game/${gameId}`);
}

/** Uploads (or overwrites) a save slot with binary state + PNG screenshot. */
export async function uploadSave(
  gameId: string,
  slot: number,
  state: Uint8Array,
  screenshot?: Uint8Array,
): Promise<SaveSlot> {
  const form = new FormData();
  form.append('gameId', gameId);
  form.append('slot', String(slot));
  form.append('state', new Blob([state as BlobPart], { type: 'application/octet-stream' }), 'state.bin');
  if (screenshot) {
    form.append('screenshot', new Blob([screenshot as BlobPart], { type: 'image/png' }), 'shot.png');
  }

  const res = await fetch(`${API_BASE}/saves/slot`, { method: 'POST', body: form });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error?.code ?? 'http_error', body?.error?.message ?? res.statusText, res.status);
  }
  return body.data as SaveSlot;
}

/** Deletes a save slot. */
export async function deleteSave(saveId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/saves/${saveId}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new ApiError('http_error', res.statusText, res.status);
  }
}

/** Downloads a save slot's binary state. */
export async function downloadSave(downloadUrl: string): Promise<Uint8Array> {
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new ApiError('http_error', res.statusText, res.status);
  }
  return new Uint8Array(await res.arrayBuffer());
}

/** Reports elapsed play time for a game (best-effort). */
export async function recordHistory(gameId: string, seconds: number): Promise<void> {
  await fetch(`${API_BASE}/history/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, seconds }),
  }).catch(() => {
    /* best-effort; ignore network errors on exit */
  });
}
