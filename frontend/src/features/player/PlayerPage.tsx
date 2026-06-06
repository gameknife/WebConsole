// Fullscreen emulator playback route. Mounting switches input to `ingame` so the
// launcher's spatial navigation gets out of EmulatorJS's way; unmounting (exit)
// restores `launcher` mode. Exit is reachable by mouse, by the Guide/Start
// button (wired in GamepadProvider) and by Escape.

import { ArrowLeft, Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useGame, useRuntimeConfig } from '@/api/hooks';
import { recordHistory } from '@/api/saves';
import { EmulatorPlayer } from '@/emulator/EmulatorPlayer';
import { InGameMenu } from '@/emulator/InGameMenu';
import { useAppStore } from '@/store/useAppStore';
import { resolveEnginePath, useSettings } from '@/store/useSettings';

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const setInputMode = useAppStore((s) => s.setInputMode);
  const setIngameMenuOpen = useAppStore((s) => s.setIngameMenuOpen);

  const { data: game, isLoading: gameLoading } = useGame(id);
  const { data: config, isLoading: configLoading } = useRuntimeConfig();

  // Engine data source: a local settings override wins over the server default.
  const engineSource = useSettings((s) => s.engineSource);
  const volume = useSettings((s) => s.volume);
  const dataPath = resolveEnginePath(engineSource) || config?.emulatorjsDataPath || '';

  const startedAt = useRef(Date.now());

  const exit = () => navigate('/');

  // Enter ingame mode for the duration of this route; on exit, report elapsed
  // play time and make sure the in-game menu is closed and launcher restored.
  useEffect(() => {
    setInputMode('ingame');
    startedAt.current = Date.now();
    return () => {
      setInputMode('launcher');
      setIngameMenuOpen(false);
      if (id) {
        const seconds = Math.round((Date.now() - startedAt.current) / 1000);
        if (seconds > 0) recordHistory(id, seconds);
      }
    };
  }, [id, setInputMode, setIngameMenuOpen]);

  const loading = gameLoading || configLoading;

  return (
    <div className="relative h-full w-full bg-black">
      {loading && (
        <div className="flex h-full items-center justify-center gap-3 text-text-1">
          <Loader2 className="animate-spin" size={20} /> 正在加载模拟器…
        </div>
      )}

      {!loading && game && dataPath && (
        <EmulatorPlayer game={game} dataPath={dataPath} volume={volume} onExit={exit} />
      )}

      {!loading && !game && (
        <div className="flex h-full items-center justify-center text-text-dim">未找到该游戏。</div>
      )}

      {/* Exit affordance (mouse). Press Guide/Start (or Escape) for the menu. */}
      <button
        type="button"
        onClick={exit}
        className="glass absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-text-1 opacity-60 transition-opacity hover:opacity-100 hover:text-text-0"
      >
        <ArrowLeft size={16} /> 退出
      </button>

      {id && <InGameMenu gameId={id} onExit={exit} />}
    </div>
  );
}
