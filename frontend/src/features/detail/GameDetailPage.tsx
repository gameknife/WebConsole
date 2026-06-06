// Game detail view: a full-width hero with metadata and a primary "Start" CTA.
// The hero fades/scales in and the metadata rises in beneath it for a polished
// entrance (the route itself cross-fades via AnimatedOutlet).
//
// The focusable controls live in DetailContent, which mounts only once the game
// has loaded — so each useFocusable registers against a real DOM node (no
// Norigin "node reference" warnings).

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useGame } from '@/api/hooks';
import type { Game } from '@/api/types';
import { platformMeta } from '@/design/platforms';
import { useAppStore } from '@/store/useAppStore';

import { GameEditModal } from './GameEditModal';
import { SharedCoverMorph } from './SharedCoverMorph';

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: game, isLoading, isError } = useGame(id);

  if (isLoading) {
    return <Centered>加载中…</Centered>;
  }
  if (isError || !game) {
    return <Centered>未找到该游戏。</Centered>;
  }
  return <DetailContent game={game} />;
}

function DetailContent({ game }: { game: Game }) {
  const navigate = useNavigate();
  const meta = platformMeta(game.platform);
  const title = game.nameCn || game.name;
  const [editing, setEditing] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  // When arriving via a tile click, the morph overlay handles the hero reveal,
  // so the hero itself should appear instantly (no competing entrance).
  const morphing = useAppStore((s) => s.transitionCover?.gameId === game.id);

  const back = useFocusable<HTMLButtonElement>({
    focusKey: 'DETAIL_BACK',
    onEnterPress: () => navigate(-1),
  });
  const start = useFocusable<HTMLButtonElement>({
    focusKey: 'DETAIL_START',
    onEnterPress: () => navigate(`/play/${game.id}`),
  });
  const edit = useFocusable<HTMLButtonElement>({
    focusKey: 'DETAIL_EDIT',
    onEnterPress: () => setEditing(true),
  });

  // Land focus on the primary CTA. The focusable registered in this component's
  // own (earlier) effect, so focusSelf works synchronously; a timeout backup
  // covers any late layout registration.
  useEffect(() => {
    start.focusSelf();
    const t = setTimeout(() => start.focusSelf(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.id]);

  return (
    <div className="relative min-h-full">
      <SharedCoverMorph gameId={game.id} heroRef={heroRef} />

      {/* Hero backdrop */}
      <motion.div
        ref={heroRef}
        className="relative h-[46vh] min-h-[320px] w-full overflow-hidden"
        initial={morphing ? false : { opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {game.cover ? (
          <img src={game.cover} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-bg-2 via-bg-1 to-bg-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/40 to-transparent" />

        <button
          ref={back.ref}
          type="button"
          onClick={() => navigate(-1)}
          onMouseEnter={(e) => e.currentTarget.focus()}
          className={`glass absolute left-5 top-5 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-text-1 hover:text-text-0 ${
            back.focused ? 'shadow-focus' : ''
          }`}
        >
          <ArrowLeft size={16} /> 返回
        </button>

        <button
          ref={edit.ref}
          type="button"
          onClick={() => setEditing(true)}
          onMouseEnter={(e) => e.currentTarget.focus()}
          className={`glass absolute right-5 top-5 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-text-1 hover:text-text-0 ${
            edit.focused ? 'shadow-focus' : ''
          }`}
        >
          <Pencil size={16} /> 编辑
        </button>
      </motion.div>

      {/* Metadata + actions */}
      <motion.div
        className="relative -mt-24 px-8 pb-12"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.3, ease: 'easeOut' }}
      >
        <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-accent">
          {meta.label}
        </span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-text-0">{title}</h1>
        {game.name !== title && <p className="mt-1 text-text-dim">{game.name}</p>}

        <div className="mt-3 flex flex-wrap gap-2">
          {game.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-1">
              {tag}
            </span>
          ))}
        </div>

        {game.description && (
          <p className="mt-4 max-w-2xl leading-relaxed text-text-1">{game.description}</p>
        )}

        {/* Focusable ref on the plain <button>; the spring scale + glow run on
            the inner motion.span (see GameTile for the rationale). */}
        <button
          ref={start.ref}
          type="button"
          onClick={() => navigate(`/play/${game.id}`)}
          onMouseEnter={(e) => e.currentTarget.focus()}
          className="mt-7 inline-block rounded-lg"
        >
          <motion.span
            animate={{ scale: start.focused ? 1.04 : 1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
            className={`flex items-center gap-2 rounded-lg bg-accent px-7 py-3 text-base font-bold text-bg-0 ${
              start.focused ? 'shadow-focus' : 'shadow-lg shadow-accent/30'
            }`}
          >
            <Play size={20} fill="currentColor" /> 开始游戏
          </motion.span>
        </button>
      </motion.div>

      {editing && <GameEditModal game={game} onClose={() => setEditing(false)} />}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center text-text-dim">{children}</div>;
}
