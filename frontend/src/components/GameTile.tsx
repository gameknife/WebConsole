// A single game cover tile, registered into the spatial-navigation focus tree.
//
// Focus visuals (spring scale + glow) are driven by Norigin's `focused` flag so
// the gamepad/keyboard and the mouse share one look. On focus the tile scrolls
// itself into view; confirm (A / Enter / click) opens the detail page.

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Game } from '@/api/types';
import { platformMeta } from '@/design/platforms';
import { useAppStore } from '@/store/useAppStore';

interface GameTileProps {
  game: Game;
  /** Focus-key namespace; lets the same game appear in multiple rows. */
  focusKeyPrefix?: string;
}

export function GameTile({ game, focusKeyPrefix = 'GAME' }: GameTileProps) {
  const navigate = useNavigate();
  const setLastFocusedGameId = useAppStore((s) => s.setLastFocusedGameId);
  const setTransitionCover = useAppStore((s) => s.setTransitionCover);
  const meta = platformMeta(game.platform);
  const title = game.nameCn || game.name;
  const [coverError, setCoverError] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);

  // Capture the cover's viewport rect so the detail hero can FLIP-morph from it.
  const open = () => {
    const el = coverRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setTransitionCover({
        gameId: game.id,
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        src: game.cover && !coverError ? game.cover : null,
        platformLabel: meta.label,
        title,
      });
    }
    navigate(`/game/${game.id}`);
  };

  const { ref, focused } = useFocusable<HTMLButtonElement>({
    focusKey: `${focusKeyPrefix}-${game.id}`,
    onEnterPress: open,
    onFocus: ({ node }) => {
      setLastFocusedGameId(game.id);
      node?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    },
  });

  return (
    // The Norigin focusable ref lives on a plain <button> (a stable DOM node it
    // can measure); the spring scale runs on an inner motion.div. Attaching the
    // ref directly to a motion component caused Norigin's "node reference"
    // warnings due to Framer's ref-assignment timing.
    <button
      ref={ref}
      type="button"
      onClick={open}
      onMouseEnter={(e) => e.currentTarget.focus()}
      className="group relative shrink-0 cursor-pointer rounded-lg text-left"
      style={{ width: 'var(--tile-w)' }}
    >
      <motion.div
        animate={{ scale: focused ? 1.06 : 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      >
        <div
          ref={coverRef}
          className={`relative overflow-hidden rounded-lg transition-shadow ${
            focused ? 'shadow-focus' : 'shadow-lg shadow-black/40'
          }`}
          style={{ aspectRatio: 'var(--tile-ratio)' }}
        >
          {game.cover && !coverError ? (
            <img
              src={game.cover}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setCoverError(true)}
            />
          ) : (
            <PlaceholderCover title={title} platformLabel={meta.label} />
          )}

          <span className="absolute left-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-1 backdrop-blur">
            {meta.label}
          </span>
        </div>

        <div
          className={`mt-2 truncate px-0.5 text-sm font-medium ${
            focused ? 'text-text-0' : 'text-text-1'
          }`}
        >
          {title}
        </div>
      </motion.div>
    </button>
  );
}

/** A generated cover used when a game has no artwork. */
function PlaceholderCover({ title, platformLabel }: { title: string; platformLabel: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-bg-2 to-bg-0 p-3">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent/80">
        {platformLabel}
      </span>
      <span className="mt-2 line-clamp-3 text-center text-base font-semibold text-text-0">
        {title}
      </span>
    </div>
  );
}
