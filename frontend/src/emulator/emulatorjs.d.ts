// Ambient declarations for the EmulatorJS runtime globals. EmulatorJS is
// configured entirely through `window.EJS_*` variables read by its loader.js,
// and exposes the live instance as `window.EJS_emulator`.

export {};

declare global {
  interface Window {
    EJS_player?: string;
    EJS_core?: string;
    EJS_gameUrl?: string;
    EJS_biosUrl?: string;
    EJS_gameName?: string;
    EJS_gameID?: string | number;
    EJS_pathtodata?: string;
    EJS_startOnLoaded?: boolean;
    EJS_color?: string;
    EJS_backgroundColor?: string;
    EJS_volume?: number;
    EJS_language?: string;
    EJS_ready?: () => void;
    EJS_onGameStart?: () => void;
    /** The live EmulatorJS instance once started. Shape is loosely typed. */
    EJS_emulator?: {
      pause?: () => void;
      play?: () => void;
      callEvent?: (event: string) => void;
      gameManager?: unknown;
      [key: string]: unknown;
    };
  }
}
