// Global client-side UI state (Zustand). Server data lives in React Query.

import { create } from 'zustand';

/** Input mode: launcher drives UI focus; ingame hands the gamepad to EmulatorJS. */
export type InputMode = 'launcher' | 'ingame';

interface AppState {
  /** Currently selected platform tab; empty string means "All". */
  platform: string;
  setPlatform: (platform: string) => void;

  /** Whether the gamepad currently drives the launcher or the emulator. */
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;

  /** Quick Access Menu (QAM) visibility. */
  qamOpen: boolean;
  setQamOpen: (open: boolean) => void;
  toggleQam: () => void;

  /** In-game overlay menu visibility (continue/save/load/reset/exit). */
  ingameMenuOpen: boolean;
  setIngameMenuOpen: (open: boolean) => void;
  toggleIngameMenu: () => void;

  /**
   * Last game tile that held focus in the library grid. Persisting it lets us
   * restore focus to the same tile when returning from a detail/play view,
   * since the grid component unmounts on navigation (SteamOS focus memory).
   */
  lastFocusedGameId: string | null;
  setLastFocusedGameId: (id: string) => void;

  /**
   * Shared-element transition source: the clicked tile cover's viewport rect +
   * art, captured on navigate so the detail hero can FLIP-morph from it.
   * Consumed and cleared by the detail view.
   */
  transitionCover: TransitionCover | null;
  setTransitionCover: (t: TransitionCover | null) => void;
}

export interface TransitionCover {
  gameId: string;
  rect: { top: number; left: number; width: number; height: number };
  src: string | null;
  platformLabel: string;
  title: string;
}

export const useAppStore = create<AppState>((set) => ({
  platform: '',
  setPlatform: (platform) => set({ platform }),

  inputMode: 'launcher',
  setInputMode: (inputMode) => set({ inputMode }),

  qamOpen: false,
  setQamOpen: (qamOpen) => set({ qamOpen }),
  toggleQam: () => set((s) => ({ qamOpen: !s.qamOpen })),

  ingameMenuOpen: false,
  setIngameMenuOpen: (ingameMenuOpen) => set({ ingameMenuOpen }),
  toggleIngameMenu: () => set((s) => ({ ingameMenuOpen: !s.ingameMenuOpen })),

  lastFocusedGameId: null,
  setLastFocusedGameId: (lastFocusedGameId) => set({ lastFocusedGameId }),

  transitionCover: null,
  setTransitionCover: (transitionCover) => set({ transitionCover }),
}));
