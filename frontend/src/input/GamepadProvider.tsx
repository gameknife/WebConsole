// GamepadProvider boots the spatial-navigation engine and bridges the semantic
// input events (from useGamepad) into focus navigation and app actions.
//
// Norigin owns keyboard arrows + Enter natively; this provider adds the gamepad
// loop on top, translating directions into navigateByDirection and actions into
// confirm/back/tab/QAM behaviour. In `ingame` mode the launcher navigation is
// suspended so it does not fight EmulatorJS for the controller.

import {
  init,
  navigateByDirection,
  pause,
  resume,
} from '@noriginmedia/norigin-spatial-navigation';
import { useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { PLATFORMS } from '@/design/platforms';
import { useAppStore } from '@/store/useAppStore';

import { useGamepad } from './useGamepad';
import type { Action, Direction } from './semantics';

// Initialise the engine exactly once, before any focusable mounts. Norigin
// focuses the actual DOM node so keyboard Enter activates <button>s natively and
// we can trigger gamepad "confirm" via document.activeElement.click().
let initialised = false;
function ensureInit() {
  if (initialised) return;
  init({ debug: false, visualDebug: false, shouldFocusDOMNode: true });
  initialised = true;
}
ensureInit();

/** Ordered platform-tab ids, with "" representing the All tab. */
const TAB_IDS = ['', ...PLATFORMS.map((p) => p.id)];

export function GamepadProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const inputMode = useAppStore((s) => s.inputMode);
  const platform = useAppStore((s) => s.platform);
  const setPlatform = useAppStore((s) => s.setPlatform);
  const qamOpen = useAppStore((s) => s.qamOpen);
  const setQamOpen = useAppStore((s) => s.setQamOpen);
  const toggleQam = useAppStore((s) => s.toggleQam);
  const ingameMenuOpen = useAppStore((s) => s.ingameMenuOpen);
  const setIngameMenuOpen = useAppStore((s) => s.setIngameMenuOpen);

  // UI navigation is active in the launcher, or when an overlay (QAM / in-game
  // menu) is open on top of a running game.
  const navActive = inputMode === 'launcher' || qamOpen || ingameMenuOpen;

  // Suspend spatial navigation when the controller belongs to the emulator
  // (in-game with no overlay open); resume it otherwise.
  useEffect(() => {
    if (navActive) resume();
    else pause();
  }, [navActive]);

  const onDirection = (dir: Direction) => {
    if (!navActive) return;
    navigateByDirection(dir, {});
  };

  const cycleTab = (delta: number) => {
    const idx = Math.max(0, TAB_IDS.indexOf(platform));
    const next = (idx + delta + TAB_IDS.length) % TAB_IDS.length;
    setPlatform(TAB_IDS[next]);
  };

  const onAction = (action: Action) => {
    // Pure gameplay (in-game, no overlay): only the Guide/Start button is
    // intercepted — it opens the in-game menu. All other buttons reach the
    // emulator untouched.
    if (inputMode === 'ingame' && !ingameMenuOpen) {
      if (action === 'guide' || action === 'menu') setIngameMenuOpen(true);
      return;
    }

    switch (action) {
      case 'confirm':
        (document.activeElement as HTMLElement | null)?.click();
        break;
      case 'back':
        if (ingameMenuOpen) {
          setIngameMenuOpen(false);
        } else if (qamOpen) {
          setQamOpen(false);
        } else if (location.pathname !== '/') {
          navigate(-1);
        }
        break;
      case 'tabPrev':
        cycleTab(-1);
        break;
      case 'tabNext':
        cycleTab(1);
        break;
      case 'menu':
      case 'guide':
        if (ingameMenuOpen) setIngameMenuOpen(false);
        else toggleQam();
        break;
      case 'context':
        break;
    }
  };

  // The poll loop runs in every mode so the Guide button works in-game; the
  // handlers above decide what each input does based on the current input mode.
  useGamepad({ onDirection, onAction }, true);

  return <>{children}</>;
}
