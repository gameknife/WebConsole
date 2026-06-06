// Shimmering skeleton placeholders shown while data loads, matching the tile
// geometry so the layout doesn't jump when real content arrives.

interface SkeletonProps {
  className?: string;
}

/** A single shimmering block. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton-shimmer rounded-lg ${className}`} />;
}

/** A grid of skeleton tiles approximating the library layout. */
export function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid"
      style={{
        gap: 'var(--shelf-gap)',
        gridTemplateColumns: 'repeat(auto-fill, minmax(var(--tile-w), 1fr))',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="w-full" style={{ aspectRatio: 'var(--tile-ratio)' }}>
            <Skeleton className="h-full w-full" />
          </div>
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}
