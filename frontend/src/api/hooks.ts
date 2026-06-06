// TanStack Query hooks for the game-library API.

import { useQuery } from '@tanstack/react-query';

import { apiGet } from './client';
import type { Game, GameList, GameQuery, PlatformCount, RuntimeConfig } from './types';

/** Query-key factory keeps cache keys consistent across the app. */
export const queryKeys = {
  games: (q: GameQuery) => ['games', q] as const,
  game: (id: string) => ['game', id] as const,
  recent: (limit: number) => ['games', 'recent', limit] as const,
  platforms: () => ['stats', 'platforms'] as const,
  config: () => ['config'] as const,
  tags: () => ['tags'] as const,
};

/** Lists the most-recently-played games (Continue Playing shelf). */
export function useRecentGames(limit = 12) {
  return useQuery({
    queryKey: queryKeys.recent(limit),
    queryFn: () => apiGet<Game[]>('/games/recent', { limit }),
  });
}

/** Lists games with optional filtering / pagination. */
export function useGames(query: GameQuery = {}) {
  return useQuery({
    queryKey: queryKeys.games(query),
    queryFn: () => apiGet<GameList>('/games', query as Record<string, unknown>),
  });
}

/** Fetches a single game by ID. */
export function useGame(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.game(id ?? ''),
    queryFn: () => apiGet<Game>(`/games/${id}`),
    enabled: !!id,
  });
}

/** Fetches per-platform game counts. */
export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.platforms(),
    queryFn: () => apiGet<PlatformCount[]>('/stats/platforms'),
  });
}

/** Fetches runtime config (e.g. EmulatorJS data path). */
export function useRuntimeConfig() {
  return useQuery({
    queryKey: queryKeys.config(),
    queryFn: () => apiGet<RuntimeConfig>('/config'),
    staleTime: Infinity,
  });
}
