// Quick Access Menu (QAM): a SteamOS-style slide-in panel toggled by the Guide
// or Start (long-press) button. This is the Phase 3 skeleton — a focusable,
// gamepad-navigable glass panel with a few stub actions. Phase 6 fleshes out
// volume / aspect ratio / shader controls.

import { FocusContext, useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize, Power, Settings, X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppStore } from '@/store/useAppStore';

import { VolumeControl } from './VolumeControl';

export function QuickAccessMenu() {
  const qamOpen = useAppStore((s) => s.qamOpen);
  // The focusable panel is mounted only while open (in QamPanel), so its
  // useFocusable registers with a live DOM node — no Norigin node warnings.
  return <AnimatePresence>{qamOpen && <QamPanel />}</AnimatePresence>;
}

function QamPanel() {
  const setQamOpen = useAppStore((s) => s.setQamOpen);
  const navigate = useNavigate();

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'QAM',
    isFocusBoundary: true, // trap focus inside the menu while open
    trackChildren: true,
    saveLastFocusedChild: false,
  });

  // Focus the panel; a deferred second call lets Norigin finish building the
  // child list so focus delegates onto the first menu item.
  useEffect(() => {
    focusSelf();
    const t = setTimeout(focusSelf, 60);
    return () => clearTimeout(t);
  }, [focusSelf]);

  return (
    <FocusContext.Provider value={focusKey}>
          {/* Scrim */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQamOpen(false)}
          />
          {/* Panel */}
          <motion.aside
            ref={ref}
            className="glass fixed right-0 top-0 z-50 flex h-full w-80 flex-col gap-2 p-5"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-0">快捷菜单</h2>
              <QamItem label="关闭" onSelect={() => setQamOpen(false)}>
                <X size={18} />
              </QamItem>
            </div>

            <VolumeControl />

            <QamItem label="全屏" onSelect={() => document.documentElement.requestFullscreen?.()}>
              <Maximize size={18} /> 全屏
            </QamItem>
            <QamItem
              label="设置"
              onSelect={() => {
                setQamOpen(false);
                navigate('/settings');
              }}
            >
              <Settings size={18} /> 设置
            </QamItem>
            <QamItem
              label="返回主页"
              onSelect={() => {
                setQamOpen(false);
                navigate('/');
              }}
            >
              <Power size={18} /> 返回主页
            </QamItem>
          </motion.aside>
    </FocusContext.Provider>
  );
}

/** A focusable row inside the QAM. */
function QamItem({
  label,
  onSelect,
  children,
}: {
  label: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  const { ref, focused } = useFocusable<HTMLButtonElement>({
    onEnterPress: onSelect,
  });
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
