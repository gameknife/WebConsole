// Thin, defensive wrappers around the live EmulatorJS instance for the in-game
// menu. EmulatorJS runs inside a same-origin iframe, so the instance lives on
// the iframe window (obtained via the bridge), not the top window.
//
// Runtime API (verified against the CDN build):
//   gameManager.getState()   -> Uint8Array (sync)
//   gameManager.screenshot() -> Promise<Uint8Array(PNG)>  (hangs while paused!)
//   gameManager.loadState(bytes), gameManager.restart()
//   EJS_emulator.pause() / play()

import { getEmulatorWindow } from './bridge';

interface EjsEmulator {
  gameManager?: Record<string, (...args: unknown[]) => unknown>;
  pause?: () => void;
  play?: () => void;
  setVolume?: (v: number) => void;
}

/** Returns the live EJS_emulator instance from the iframe, or null. */
function emu(): EjsEmulator | null {
  const win = getEmulatorWindow() as (Window & { EJS_emulator?: EjsEmulator }) | null;
  return win?.EJS_emulator ?? null;
}

/** True once the emulator is loaded and able to produce/consume states. */
export function emulatorReady(): boolean {
  const e = emu();
  return !!e?.gameManager && typeof e.gameManager.getState === 'function';
}

/** Captures the current save state as raw bytes. */
export function captureState(): Uint8Array | null {
  try {
    const st = emu()?.gameManager?.getState?.() as Uint8Array | undefined;
    return st ?? null;
  } catch {
    return null;
  }
}

/** Captures a PNG screenshot of the current frame. */
export async function captureScreenshot(): Promise<Uint8Array | undefined> {
  try {
    return (await emu()?.gameManager?.screenshot?.()) as Uint8Array | undefined;
  } catch {
    return undefined;
  }
}

/** Restores a previously captured save state. */
export function restoreState(bytes: Uint8Array): void {
  emu()?.gameManager?.loadState?.(bytes);
}

/** Restarts (resets) the running game. */
export function resetGame(): void {
  emu()?.gameManager?.restart?.();
}

/** Pauses emulation (e.g. while the in-game menu is open). */
export function pauseGame(): void {
  emu()?.pause?.();
}

/** Resumes emulation. */
export function resumeGame(): void {
  emu()?.play?.();
}

/** Sets the live emulator volume (0–1), if a game is running. */
export function setEmulatorVolume(v: number): void {
  emu()?.setVolume?.(v);
}
