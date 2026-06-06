// Platform filter tabs (All / NES / SNES / GBA / GB(C)). Selecting a tab
// updates the global platform filter. Counts come from /stats/platforms.

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { motion } from 'framer-motion';

import { usePlatformStats } from '@/api/hooks';
import { PLATFORMS } from '@/design/platforms';
import { useAppStore } from '@/store/useAppStore';

export function PlatformTabs() {
  const platform = useAppStore((s) => s.platform);
  const setPlatform = useAppStore((s) => s.setPlatform);
  const { data: stats } = usePlatformStats();

  const countFor = (id: string) => stats?.find((s) => s.platform === id)?.count ?? 0;
  const total = stats?.reduce((sum, s) => sum + s.count, 0) ?? 0;

  const tabs = [{ id: '', label: '全部', count: total }, ...PLATFORMS.map((p) => ({
    id: p.id,
    label: p.label,
    count: countFor(p.id),
  }))];

  return (
    <nav className="flex items-center gap-1">
      {tabs.map((tab) => (
        <PlatformTab
          key={tab.id || 'all'}
          id={tab.id}
          label={tab.label}
          count={tab.count}
          active={tab.id === platform}
          onSelect={() => setPlatform(tab.id)}
        />
      ))}
    </nav>
  );
}

interface PlatformTabProps {
  id: string;
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}

function PlatformTab({ id, label, count, active, onSelect }: PlatformTabProps) {
  const { ref, focused } = useFocusable<HTMLButtonElement>({
    focusKey: `TAB-${id || 'all'}`,
    onEnterPress: onSelect,
  });

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      onMouseEnter={(e) => e.currentTarget.focus()}
      className={`relative rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'text-bg-0' : 'text-text-1 hover:text-text-0'
      } ${focused ? 'shadow-focus' : ''}`}
    >
      {active && (
        <motion.span
          layoutId="platform-tab-pill"
          className="absolute inset-0 -z-10 rounded-md bg-accent"
          transition={{ type: 'spring', stiffness: 480, damping: 34 }}
        />
      )}
      {label}
      <span className={`ml-1.5 text-xs ${active ? 'text-bg-1' : 'text-text-dim'}`}>{count}</span>
    </button>
  );
}
