// A gamepad-navigable volume control (− value +) used in the QAM and the
// in-game menu. Adjusts the persisted default volume; when `live` it also
// applies immediately to the running EmulatorJS instance.

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { Minus, Plus, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { setEmulatorVolume } from '@/emulator/controls';
import { useSettings } from '@/store/useSettings';

export function VolumeControl({ live = false }: { live?: boolean }) {
  const volume = useSettings((s) => s.volume);
  const setVolume = useSettings((s) => s.setVolume);

  const change = (delta: number) => {
    const next = Math.max(0, Math.min(1, Math.round((volume + delta) * 10) / 10));
    setVolume(next);
    if (live) setEmulatorVolume(next);
  };

  return (
    <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-text-1">
      <Volume2 size={18} />
      <span className="flex-1">音量</span>
      <VolButton label="减小音量" onSelect={() => change(-0.1)}>
        <Minus size={16} />
      </VolButton>
      <span className="w-12 text-center font-mono tabular-nums text-text-0">
        {Math.round(volume * 100)}%
      </span>
      <VolButton label="增大音量" onSelect={() => change(0.1)}>
        <Plus size={16} />
      </VolButton>
    </div>
  );
}

function VolButton({
  label,
  onSelect,
  children,
}: {
  label: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  const { ref, focused } = useFocusable<HTMLButtonElement>({ onEnterPress: onSelect });
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={onSelect}
      onMouseEnter={(e) => e.currentTarget.focus()}
      className={`rounded-md p-1.5 transition-colors ${
        focused ? 'bg-accent text-bg-0 shadow-focus' : 'bg-white/10 text-text-1 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  );
}
