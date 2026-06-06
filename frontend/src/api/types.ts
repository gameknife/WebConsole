// Shared API response types mirroring the Go backend DTOs.

/** Standard success envelope: `{ data: ... }`. */
export interface ApiEnvelope<T> {
  data: T;
}

/** A single playable game. */
export interface Game {
  id: string;
  name: string;
  nameCn: string;
  platform: string;
  core: string;
  description: string;
  cover: string;
  romUrl: string;
  biosUrl: string;
  fileSize: number;
  playCount: number;
  tags: string[];
}

/** Paginated game listing. */
export interface GameList {
  items: Game[];
  total: number;
  page: number;
  pageSize: number;
}

/** Per-platform game count from /stats/platforms. */
export interface PlatformCount {
  platform: string;
  count: number;
}

/** Runtime config from /config. */
export interface RuntimeConfig {
  emulatorjsDataPath: string;
}

/** A save-state slot. */
export interface SaveSlot {
  id: string;
  gameId: string;
  slot: number;
  screenshot: string; // public URL, may be empty
  downloadUrl: string; // binary state download URL
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

/** Query parameters accepted by the games listing endpoint. */
export interface GameQuery {
  platform?: string;
  search?: string;
  tag?: string;
  sort?: 'name' | 'recent' | 'playCount';
  page?: number;
  pageSize?: number;
}
