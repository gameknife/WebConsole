// Settings: device-local preferences (single-user app). Gamepad-navigable.
// Engine data source and volume are persisted and applied to the player.

import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRuntimeConfig } from '@/api/hooks';
import { resolveEnginePath, useSettings, type EngineSource } from '@/store/useSettings';

const ENGINE_OPTIONS: { value: EngineSource; label: string; hint: string }[] = [
  { value: 'default', label: '服务器默认', hint: '使用后端 /config 下发的路径' },
  { value: 'cdn', label: '官方 CDN', hint: 'cdn.emulatorjs.org（需联网）' },
  {
    value: 'selfhost',
    label: '自托管',
    hint: '/emulatorjs/data/（需放入引擎数据，缺失时自动回退 CDN）',
  },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const { data: config } = useRuntimeConfig();

  const engineSource = useSettings((s) => s.engineSource);
  const setEngineSource = useSettings((s) => s.setEngineSource);
  const volume = useSettings((s) => s.volume);
  const setVolume = useSettings((s) => s.setVolume);

  const { ref, focusKey, focusSelf } = useFocusable({ focusKey: 'SETTINGS', trackChildren: true });

  useEffect(() => {
    const raf = requestAnimationFrame(() => focusSelf());
    return () => cancelAnimationFrame(raf);
  }, [focusSelf]);

  const activePath = resolveEnginePath(engineSource) || config?.emulatorjsDataPath || '(未知)';

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="mx-auto max-w-3xl px-8 py-8">
        <Item label="返回" onSelect={() => navigate(-1)} className="mb-6 inline-flex">
          <ArrowLeft size={16} /> 返回
        </Item>

        <h1 className="text-3xl font-extrabold text-text-0">设置</h1>

        {/* Engine data source */}
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-bold text-text-0">模拟器引擎数据源</h2>
          <p className="mb-3 text-sm text-text-dim">当前生效：{activePath}</p>
          <div className="flex flex-col gap-2">
            {ENGINE_OPTIONS.map((opt) => (
              <Item
                key={opt.value}
                label={opt.label}
                onSelect={() => setEngineSource(opt.value)}
                selected={engineSource === opt.value}
              >
                <div className="flex w-full items-center justify-between">
                  <span>{opt.label}</span>
                  <span className="text-xs opacity-70">{opt.hint}</span>
                </div>
              </Item>
            ))}
          </div>
        </section>

        {/* Volume */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold text-text-0">默认音量</h2>
          <div className="flex items-center gap-3">
            <Item label="减小音量" onSelect={() => setVolume(clamp(volume - 0.1))}>
              <Minus size={18} />
            </Item>
            <span className="w-16 text-center font-mono text-lg tabular-nums text-text-0">
              {Math.round(volume * 100)}%
            </span>
            <Item label="增大音量" onSelect={() => setVolume(clamp(volume + 0.1))}>
              <Plus size={18} />
            </Item>
          </div>
        </section>

        <section className="mt-10 text-sm text-text-dim">
          <p>控制器映射 / 画面滤镜将在后续版本加入。</p>
          <p className="mt-1">WebConsole · 手柄优先的自托管网页游戏机。</p>
        </section>
      </div>
    </FocusContext.Provider>
  );
}

function clamp(v: number): number {
  return Math.max(0, Math.min(1, Math.round(v * 10) / 10));
}

/** A focusable settings control. */
function Item({
  label,
  onSelect,
  selected = false,
  className = '',
  children,
}: {
  label: string;
  onSelect: () => void;
  selected?: boolean;
  className?: string;
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
      className={`flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors ${
        focused
          ? 'bg-accent text-bg-0 shadow-focus'
          : selected
            ? 'bg-accent/20 text-accent'
            : 'glass text-text-1 hover:text-text-0'
      } ${className}`}
    >
      {children}
    </button>
  );
}
