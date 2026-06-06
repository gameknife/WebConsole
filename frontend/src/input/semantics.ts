// Semantic input model: raw gamepad/keyboard signals are translated into a
// small set of direction intents and named actions that the navigation layer
// consumes. This keeps the rest of the app decoupled from button indices.

export type Direction = 'up' | 'down' | 'left' | 'right';

export type Action =
  | 'confirm' // A
  | 'back' // B
  | 'context' // X / Y
  | 'tabPrev' // LB
  | 'tabNext' // RB
  | 'menu' // Start (short press)
  | 'guide'; // Guide button / Start long-press

/** Standard Gamepad button indices (W3C "standard" mapping). */
export const BTN = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  SELECT: 8,
  START: 9,
  DPAD_UP: 12,
  DPAD_DOWN: 13,
  DPAD_LEFT: 14,
  DPAD_RIGHT: 15,
  GUIDE: 16,
} as const;

/** Left-stick deadzone below which axis input is ignored. */
export const STICK_DEADZONE = 0.5;

/** Direction repeat timing (ms): first repeat after INITIAL, then every INTERVAL. */
export const REPEAT_INITIAL_MS = 380;
export const REPEAT_INTERVAL_MS = 90;

/** How long Start must be held (ms) to fire `guide` instead of `menu`. */
export const GUIDE_HOLD_MS = 500;
