// useGamepad runs a requestAnimationFrame poll loop over navigator.getGamepads,
// because the Gamepad API exposes no input events. It performs edge detection on
// buttons, debounced auto-repeat on directions (dpad + left stick), and mirrors
// the same semantic events onto the keyboard for controller-free debugging.

import { useEffect, useRef } from 'react';

import {
  BTN,
  GUIDE_HOLD_MS,
  REPEAT_INITIAL_MS,
  REPEAT_INTERVAL_MS,
  STICK_DEADZONE,
  type Action,
  type Direction,
} from './semantics';

export interface GamepadHandlers {
  onDirection: (dir: Direction) => void;
  onAction: (action: Action) => void;
}

/** Tracks the held state + next-repeat time for one direction. */
interface DirState {
  held: boolean;
  nextRepeat: number;
}

export function useGamepad(handlers: GamepadHandlers, enabled = true) {
  // Keep handlers in a ref so the RAF loop always sees the latest closures
  // without restarting the loop on every render.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    const directions: Record<Direction, DirState> = {
      up: { held: false, nextRepeat: 0 },
      down: { held: false, nextRepeat: 0 },
      left: { held: false, nextRepeat: 0 },
      right: { held: false, nextRepeat: 0 },
    };
    // Previous pressed state per button index, for rising-edge detection.
    const prevButtons: boolean[] = [];
    let startPressedAt = 0;
    let startFiredGuide = false;
    let raf = 0;

    /** Emits a direction immediately and schedules its first auto-repeat. */
    const fireDirection = (dir: Direction, now: number) => {
      handlersRef.current.onDirection(dir);
      directions[dir].nextRepeat = now + REPEAT_INITIAL_MS;
    };

    /** Updates one direction's held/repeat bookkeeping given its current state. */
    const updateDirection = (dir: Direction, active: boolean, now: number) => {
      const state = directions[dir];
      if (active) {
        if (!state.held) {
          state.held = true;
          fireDirection(dir, now);
        } else if (now >= state.nextRepeat) {
          handlersRef.current.onDirection(dir);
          state.nextRepeat = now + REPEAT_INTERVAL_MS;
        }
      } else {
        state.held = false;
      }
    };

    /** Fires an action on the rising edge of a button. */
    const edge = (index: number, pressed: boolean, action: Action) => {
      if (pressed && !prevButtons[index]) {
        handlersRef.current.onAction(action);
      }
    };

    const poll = () => {
      raf = requestAnimationFrame(poll);
      if (!enabledRef.current) return;

      const pads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(pads).find((p): p is Gamepad => p != null);
      const now = performance.now();
      if (!pad) return;

      const pressed = (i: number) => pad.buttons[i]?.pressed ?? false;
      const axisX = pad.axes[0] ?? 0;
      const axisY = pad.axes[1] ?? 0;

      // Directions: dpad OR left stick past the deadzone.
      updateDirection('up', pressed(BTN.DPAD_UP) || axisY < -STICK_DEADZONE, now);
      updateDirection('down', pressed(BTN.DPAD_DOWN) || axisY > STICK_DEADZONE, now);
      updateDirection('left', pressed(BTN.DPAD_LEFT) || axisX < -STICK_DEADZONE, now);
      updateDirection('right', pressed(BTN.DPAD_RIGHT) || axisX > STICK_DEADZONE, now);

      // Simple action buttons (rising edge).
      edge(BTN.A, pressed(BTN.A), 'confirm');
      edge(BTN.B, pressed(BTN.B), 'back');
      edge(BTN.X, pressed(BTN.X), 'context');
      edge(BTN.Y, pressed(BTN.Y), 'context');
      edge(BTN.LB, pressed(BTN.LB), 'tabPrev');
      edge(BTN.RB, pressed(BTN.RB), 'tabNext');
      edge(BTN.GUIDE, pressed(BTN.GUIDE), 'guide');

      // Start: short press => menu, long press => guide.
      const startPressed = pressed(BTN.START);
      if (startPressed && !prevButtons[BTN.START]) {
        startPressedAt = now;
        startFiredGuide = false;
      }
      if (startPressed && !startFiredGuide && now - startPressedAt >= GUIDE_HOLD_MS) {
        handlersRef.current.onAction('guide');
        startFiredGuide = true;
      }
      if (!startPressed && prevButtons[BTN.START] && !startFiredGuide) {
        handlersRef.current.onAction('menu');
      }

      // Snapshot button state for next frame's edge detection.
      for (let i = 0; i < pad.buttons.length; i++) {
        prevButtons[i] = pad.buttons[i]?.pressed ?? false;
      }
    };

    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard mirror for actions the spatial-navigation library does not map
  // natively. Arrow keys and Enter are handled by Norigin's own keyboard
  // bindings (so they stay consistent with the focus engine); here we only add
  // Escape/Backspace -> back and the menu/QAM keys for controller-free testing.
  useEffect(() => {
    const keyAction: Record<string, Action> = {
      // Escape mirrors the Guide/Start button: it opens the QAM (launcher) or
      // the in-game menu, and closes them again. Backspace is the "back" action.
      Escape: 'menu',
      Backspace: 'back',
      Tab: 'tabNext',
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      // Enter is handled by the spatial-navigation engine's onEnterPress. Block
      // the browser's native button activation so a focused <button> is not
      // *also* clicked, which would fire the action (and navigation) twice.
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      const action = keyAction[e.key];
      if (action) {
        e.preventDefault();
        handlersRef.current.onAction(action);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
