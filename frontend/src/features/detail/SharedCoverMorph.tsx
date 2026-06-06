// FLIP-style shared-element transition: when arriving from a tile click, this
// renders a fixed-position overlay that starts at the clicked tile cover's
// viewport rect and animates to the detail hero's rect, then removes itself —
// revealing the real hero underneath. Done outside the spatial-navigation focus
// tree (pure visual layer), so it can't destabilise gamepad focus.

import { motion } from 'framer-motion';
import { useEffect, useState, type RefObject } from 'react';

import { useAppStore } from '@/store/useAppStore';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SharedCoverMorphProps {
  gameId: string;
  heroRef: RefObject<HTMLElement>;
}

export function SharedCoverMorph({ gameId, heroRef }: SharedCoverMorphProps) {
  const transitionCover = useAppStore((s) => s.transitionCover);
  const clear = useAppStore((s) => s.setTransitionCover);
  const [target, setTarget] = useState<Rect | null>(null);

  const active = transitionCover?.gameId === gameId;

  // Measure the hero rect. The hero is a Framer motion.div sibling whose ref may
  // attach a tick late, so retry briefly until it's available.
  useEffect(() => {
    if (!active) return;
    let tries = 0;
    let timer = 0;
    const measure = () => {
      const el = heroRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        setTarget({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (tries++ < 10) {
        timer = window.setTimeout(measure, 16);
      }
    };
    measure();
    return () => window.clearTimeout(timer);
  }, [active, heroRef]);

  // Safety backstop: always clear the overlay shortly after it appears, in case
  // onAnimationComplete doesn't fire, so it can never get stuck over the hero.
  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => clear(null), 700);
    return () => window.clearTimeout(t);
  }, [active, clear]);

  if (!active || !transitionCover || !target) return null;

  const { rect, src, platformLabel, title } = transitionCover;

  // FLIP via transforms (GPU-accelerated, reliable): the element is laid out at
  // the TARGET rect, then started at the source via translate + scale and
  // animated to identity.
  const dx = rect.left - target.left;
  const dy = rect.top - target.top;
  const sx = rect.width / target.width;
  const sy = rect.height / target.height;

  return (
    <motion.div
      className="pointer-events-none fixed z-40 overflow-hidden"
      style={{
        top: target.top,
        left: target.left,
        width: target.width,
        height: target.height,
        transformOrigin: 'top left',
      }}
      initial={{ x: dx, y: dy, scaleX: sx, scaleY: sy, borderRadius: 14 }}
      animate={{ x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 32 }}
      onAnimationComplete={() => clear(null)}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-bg-2 via-bg-1 to-bg-0">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-accent/80">
            {platformLabel}
          </span>
          <span className="mt-2 px-4 text-center text-xl font-semibold text-text-0">{title}</span>
        </div>
      )}
      {/* match the hero's bottom fade so the hand-off to the real hero is seamless */}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-0 via-bg-0/40 to-transparent" />
    </motion.div>
  );
}
