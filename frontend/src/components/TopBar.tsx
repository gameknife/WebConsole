// The top status bar (SteamOS Big Picture style): brand, platform tabs, a live
// clock and a settings entry point.

import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PlatformTabs } from './PlatformTabs';

export function TopBar() {
  const navigate = useNavigate();
  const clock = useClock();

  return (
    <header className="glass sticky top-0 z-20 flex items-center gap-6 px-6 py-3">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="text-lg font-extrabold tracking-tight text-text-0"
      >
        Web<span className="text-accent">Console</span>
      </button>

      <div className="flex-1">
        <PlatformTabs />
      </div>

      <span className="font-mono text-sm tabular-nums text-text-1">{clock}</span>

      <button
        type="button"
        onClick={() => navigate('/settings')}
        aria-label="设置"
        className="rounded-md p-2 text-text-1 transition-colors hover:bg-white/5 hover:text-text-0"
      >
        <Settings size={20} />
      </button>
    </header>
  );
}

/** Returns a live HH:MM clock string, updated each minute. */
function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
}
