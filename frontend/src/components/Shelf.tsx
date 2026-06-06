// A horizontal, scrollable row of tiles with a section title — the SteamOS
// "shelf" pattern. Used for "Continue Playing", per-platform rows, etc.

import type { ReactNode } from 'react';

interface ShelfProps {
  title: string;
  children: ReactNode;
}

export function Shelf({ title, children }: ShelfProps) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 px-1 text-lg font-bold tracking-wide text-text-0">{title}</h2>
      <div
        className="flex scroll-smooth overflow-x-auto pb-3"
        style={{ gap: 'var(--shelf-gap)' }}
      >
        {children}
      </div>
    </section>
  );
}
