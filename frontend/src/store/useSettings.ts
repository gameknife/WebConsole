// User settings, persisted to localStorage. These are device-local preferences
// (the app is single-user) and override server defaults where applicable.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Where to load the EmulatorJS engine data from. */
export type EngineSource = 'default' | 'cdn' | 'selfhost';

/** Resolves an EngineSource to a concrete data path, or '' to use the server's
 *  /config value. */
export function resolveEnginePath(source: EngineSource): string {
  switch (source) {
    case 'cdn':
      return 'https://cdn.emulatorjs.org/stable/data/';
    case 'selfhost':
      return '/emulatorjs/data/';
    default:
      return '';
  }
}

interface SettingsState {
  /** EmulatorJS engine data source. */
  engineSource: EngineSource;
  setEngineSource: (source: EngineSource) => void;

  /** Default audio volume (0–1) applied to new emulator sessions. */
  volume: number;
  setVolume: (v: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      engineSource: 'default',
      setEngineSource: (engineSource) => set({ engineSource }),

      volume: 0.5,
      setVolume: (volume) => set({ volume }),
    }),
    { name: 'webconsole-settings' },
  ),
);
