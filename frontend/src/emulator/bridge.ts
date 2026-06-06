// EmulatorJS now runs inside a same-origin <iframe> (see EmulatorPlayer), so the
// live `EJS_emulator` lives on the iframe's contentWindow, not the top window.
// This module is a tiny registry the in-game menu / controls use to reach it.

let emulatorWindow: Window | null = null;

/** Registered by EmulatorPlayer once the iframe is mounted. */
export function setEmulatorWindow(win: Window | null) {
  emulatorWindow = win;
}

/** Returns the window hosting the live EmulatorJS instance, or null. */
export function getEmulatorWindow(): Window | null {
  return emulatorWindow;
}
