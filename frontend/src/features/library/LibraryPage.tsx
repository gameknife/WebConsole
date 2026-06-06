// The home library view: a responsive grid of game tiles filtered by the
// currently selected platform tab.
//
// The grid is a spatial-navigation focus container with saveLastFocusedChild,
// so leaving the grid (e.g. into a tab or detail) and returning restores the
// previously focused tile — the SteamOS "focus memory" feel.

import {
  doesFocusableExist,
  FocusContext,
  setFocus,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useEffect } from 'react';

import { useGames, useRecentGames } from '@/api/hooks';
import { GameTile } from '@/components/GameTile';
import { Shelf } from '@/components/Shelf';
import { SkeletonGrid } from '@/components/Skeleton';
import { useAppStore } from '@/store/useAppStore';

export function LibraryPage() {
  const platform = useAppStore((s) => s.platform);
  const lastFocusedGameId = useAppStore((s) => s.lastFocusedGameId);
  const { data, isLoading, isError, error } = useGames({ platform, sort: 'name', pageSize: 200 });
  const { data: recent } = useRecentGames(12);

  // The Continue Playing shelf only shows on the "All" tab.
  const recentGames = platform === '' ? (recent ?? []) : [];

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'LIBRARY_GRID',
    saveLastFocusedChild: true,
    trackChildren: true,
  });

  const games = data?.items ?? [];

  // Once games are present, restore focus to the previously focused tile (the
  // grid unmounts on navigation, so we re-seed focus from the persisted id),
  // falling back to the first tile. Tiles register their focusables in their own
  // effects, which can land a frame after this one, so we retry across a few
  // frames until the target focusable exists.
  useEffect(() => {
    if (games.length === 0) return;
    // React runs child effects (tile registration) before this parent effect,
    // so the tile focusables already exist — set focus synchronously. A timeout
    // backup covers any edge case where a tile registers a tick later.
    const focusTarget = () => {
      const preferred = lastFocusedGameId ? `GAME-${lastFocusedGameId}` : '';
      const first = games[0] ? `GAME-${games[0].id}` : '';
      const target =
        preferred && doesFocusableExist(preferred)
          ? preferred
          : first && doesFocusableExist(first)
            ? first
            : '';
      if (target) {
        setFocus(target);
        return true;
      }
      return false;
    };
    if (focusTarget()) return;
    focusSelf();
    const timer = setTimeout(focusTarget, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games.length]);

  // Always render the focus-container ref div (loading/empty/error states live
  // INSIDE it) so Norigin always has a DOM node to measure — avoids the
  // "Component added without a node reference" warning.
  return (
    <div className="px-6 py-6">
      {recentGames.length > 0 && (
        <Shelf title="继续游戏">
          {recentGames.map((game) => (
            <GameTile key={game.id} game={game} focusKeyPrefix="RECENT" />
          ))}
        </Shelf>
      )}

      <FocusContext.Provider value={focusKey}>
        <div ref={ref}>
          <h2 className="mb-3 px-1 text-lg font-bold tracking-wide text-text-0">所有游戏</h2>

          {isLoading ? (
            <SkeletonGrid count={12} />
          ) : isError ? (
            <p className="py-10 text-center text-text-dim">加载失败：{(error as Error).message}</p>
          ) : games.length === 0 ? (
            <p className="py-10 text-center text-text-dim">暂无游戏。请放入 ROM 后重启后端。</p>
          ) : (
            <div
              className="grid"
              style={{
                gap: 'var(--shelf-gap)',
                gridTemplateColumns: 'repeat(auto-fill, minmax(var(--tile-w), 1fr))',
              }}
            >
              {games.map((game) => (
                <div key={game.id} className="flex justify-center">
                  <GameTile game={game} />
                </div>
              ))}
            </div>
          )}
        </div>
      </FocusContext.Provider>
    </div>
  );
}
