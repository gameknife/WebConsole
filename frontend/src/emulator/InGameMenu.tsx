// In-game overlay menu (SteamOS-style), opened by the Guide/Start button while
// a game runs. It pauses emulation, traps spatial-navigation focus, and offers
// continue / save / load / reset / exit. Save and load drop into a slot list.

import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Play, Power, RotateCcw, Save } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { listSaves, uploadSave, downloadSave } from '@/api/saves';
import type { SaveSlot } from '@/api/types';
import { VolumeControl } from '@/components/VolumeControl';
import { useAppStore } from '@/store/useAppStore';

import {
  captureScreenshot,
  captureState,
  pauseGame,
  resetGame,
  restoreState,
  resumeGame,
} from './controls';

const SAVE_SLOTS = [1, 2, 3];

type View = 'main' | 'save' | 'load';

interface InGameMenuProps {
  gameId: string;
  onExit: () => void;
}

export function InGameMenu({ gameId, onExit }: InGameMenuProps) {
  const open = useAppStore((s) => s.ingameMenuOpen);
  // The focusable panel mounts only while open, so its useFocusable registers
  // against a live DOM node (no Norigin node-reference warnings).
  return (
    <AnimatePresence>
      {open && <InGameMenuPanel gameId={gameId} onExit={onExit} />}
    </AnimatePresence>
  );
}

function InGameMenuPanel({ gameId, onExit }: InGameMenuProps) {
  const setOpen = useAppStore((s) => s.setIngameMenuOpen);

  const [view, setView] = useState<View>('main');
  const [saves, setSaves] = useState<SaveSlot[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  // Snapshot (state + screenshot) captured at the instant the menu opens —
  // BEFORE pausing — because EmulatorJS's screenshot() needs a live frame and
  // would hang on a paused emulator. Saving uses this snapshot.
  const snapshot = useRef<{ state: Uint8Array | null; shot?: Uint8Array }>({ state: null });

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'INGAME_MENU',
    isFocusBoundary: true,
    trackChildren: true,
  });

  // On mount (menu opened): grab the snapshot, then pause; load the slot list.
  useEffect(() => {
    let cancelled = false;
    listSaves(gameId).then(setSaves).catch(() => setSaves([]));

    (async () => {
      const state = captureState();
      const shot = await captureScreenshot();
      if (cancelled) return;
      snapshot.current = { state, shot };
      pauseGame();
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  // Re-seed focus whenever the visible view changes (synchronous; child menu
  // items register their focusables before this effect runs).
  useEffect(() => {
    focusSelf();
    const t = setTimeout(focusSelf, 60);
    return () => clearTimeout(t);
  }, [view, focusSelf]);

  const resume = useCallback(() => {
    setOpen(false);
    resumeGame();
  }, [setOpen]);

  const doSave = async (slot: number) => {
    setBusy(`save-${slot}`);
    try {
      // Prefer the open-time snapshot; fall back to a fresh capture.
      const state = snapshot.current.state ?? captureState();
      if (!state) return;
      await uploadSave(gameId, slot, state, snapshot.current.shot);
    } finally {
      setBusy(null);
      resume();
    }
  };

  const doLoad = async (save: SaveSlot) => {
    setBusy(`load-${save.slot}`);
    try {
      const bytes = await downloadSave(save.downloadUrl);
      restoreState(bytes);
    } finally {
      setBusy(null);
      resume();
    }
  };

  return (
    <FocusContext.Provider value={focusKey}>
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              ref={ref}
              key={view}
              className="glass w-[28rem] rounded-lg p-6"
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              {view === 'main' && (
                <>
                  <h2 className="mb-4 text-xl font-bold text-text-0">游戏菜单</h2>
                  <div className="flex flex-col gap-2">
                    <MenuItem label="继续游戏" onSelect={resume}>
                      <Play size={18} /> 继续游戏
                    </MenuItem>
                    <VolumeControl live />
                    <MenuItem label="存档" onSelect={() => setView('save')}>
                      <Save size={18} /> 存档
                    </MenuItem>
                    <MenuItem label="读档" onSelect={() => setView('load')}>
                      <Download size={18} /> 读档
                    </MenuItem>
                    <MenuItem
                      label="重置游戏"
                      onSelect={() => {
                        resetGame();
                        resume();
                      }}
                    >
                      <RotateCcw size={18} /> 重置游戏
                    </MenuItem>
                    <MenuItem label="退出到游戏库" onSelect={onExit}>
                      <Power size={18} /> 退出到游戏库
                    </MenuItem>
                  </div>
                </>
              )}

              {view === 'save' && (
                <SlotList
                  title="选择存档位"
                  onBack={() => setView('main')}
                  slots={SAVE_SLOTS.map((slot) => {
                    const existing = saves.find((s) => s.slot === slot);
                    return {
                      slot,
                      label: `存档位 ${slot}`,
                      sub: existing ? '覆盖（已有存档）' : '空',
                      screenshot: existing?.screenshot,
                      busy: busy === `save-${slot}`,
                      onSelect: () => doSave(slot),
                    };
                  })}
                />
              )}

              {view === 'load' && (
                <SlotList
                  title="选择读取的存档"
                  onBack={() => setView('main')}
                  emptyHint={saves.length === 0 ? '暂无存档' : undefined}
                  slots={saves.map((s) => ({
                    slot: s.slot,
                    label: `存档位 ${s.slot}`,
                    sub: new Date(s.updatedAt).toLocaleString('zh-CN'),
                    screenshot: s.screenshot,
                    busy: busy === `load-${s.slot}`,
                    onSelect: () => doLoad(s),
                  }))}
                />
              )}
            </motion.div>
          </motion.div>
    </FocusContext.Provider>
  );
}

interface SlotEntry {
  slot: number;
  label: string;
  sub: string;
  screenshot?: string;
  busy: boolean;
  onSelect: () => void;
}

function SlotList({
  title,
  slots,
  onBack,
  emptyHint,
}: {
  title: string;
  slots: SlotEntry[];
  onBack: () => void;
  emptyHint?: string;
}) {
  return (
    <>
      <h2 className="mb-4 text-xl font-bold text-text-0">{title}</h2>
      <div className="flex flex-col gap-2">
        {emptyHint && <p className="px-1 py-3 text-sm text-text-dim">{emptyHint}</p>}
        {slots.map((s) => (
          <MenuItem key={s.slot} label={s.label} onSelect={s.onSelect}>
            <div className="flex w-full items-center gap-3">
              {s.screenshot ? (
                <img
                  src={s.screenshot}
                  alt=""
                  className="h-10 w-14 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-14 rounded bg-white/5" />
              )}
              <div className="flex flex-col text-left">
                <span>{s.label}</span>
                <span className="text-xs opacity-70">{s.busy ? '处理中…' : s.sub}</span>
              </div>
            </div>
          </MenuItem>
        ))}
        <MenuItem label="返回" onSelect={onBack}>
          返回
        </MenuItem>
      </div>
    </>
  );
}

/** A focusable menu row. */
function MenuItem({
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
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
        focused ? 'bg-accent text-bg-0 shadow-focus' : 'text-text-1 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
