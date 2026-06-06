// EmulatorPlayer hosts EmulatorJS — the single emulation engine for all
// platforms — inside a SAME-ORIGIN <iframe srcDoc>.
//
// Why an iframe: EmulatorJS has no reliable in-place "destroy", and leftover
// emscripten/WebGL/RAF/AudioContext state caused a black screen when switching
// or re-entering games. Removing the iframe on unmount tears the entire engine
// context down for free, so every launch is guaranteed fresh.
//
// Exit handling: the iframe registers EmulatorJS's `exit` event (fired by its
// built-in "Exit Emulation" button) and postMessages the parent, which then
// navigates back to the library — so the engine's own exit and the app's exit
// both end up in the same place, with full teardown.

import { useEffect, useRef, useState } from 'react';

import type { Game } from '@/api/types';

import { setEmulatorWindow } from './bridge';

/** Official CDN fallback when a configured (e.g. self-hosted) data path is
 *  missing/misconfigured. */
const CDN_DATA = 'https://cdn.emulatorjs.org/stable/data/';

interface EmulatorPlayerProps {
  game: Game;
  /** EmulatorJS engine data path (CDN or self-hosted), from /api/v1/config. */
  dataPath: string;
  /** Initial audio volume 0–1. */
  volume?: number;
  /** Called when EmulatorJS's own exit button is used (navigate back). */
  onExit?: () => void;
}

/** Message the iframe posts to the parent when EmulatorJS exits. */
const EXIT_MESSAGE = 'webconsole:emulator-exit';

/** Resolves a possibly root-relative URL to an absolute one against the parent
 *  origin. srcdoc documents may use an `about:srcdoc` base, so EmulatorJS needs
 *  fully-qualified URLs to fetch the ROM, BIOS and engine data. */
function abs(url: string): string {
  if (!url) return '';
  return new URL(url, window.location.origin).href;
}

/** Verifies the data path actually serves the EmulatorJS loader as JavaScript
 *  (not, say, an SPA index.html fallback when self-hosted data is absent). */
async function loaderIsValid(dataPath: string): Promise<boolean> {
  try {
    const url = abs(dataPath).replace(/\/?$/, '/') + 'loader.js';
    const res = await fetch(url);
    if (!res.ok) return false;
    if ((res.headers.get('content-type') || '').includes('html')) return false;
    const text = await res.text();
    return !text.trimStart().startsWith('<');
  } catch {
    return false;
  }
}

/** Builds the self-contained HTML document that boots EmulatorJS. */
function buildSrcDoc(game: Game, dataPath: string, volume: number): string {
  const absData = abs(dataPath).replace(/\/?$/, '/');
  const loaderUrl = absData + 'loader.js';

  // Pass config as JSON to avoid string-escaping pitfalls; neutralise any
  // stray "</script>" in values.
  const cfg = {
    player: '#game',
    core: game.core,
    gameUrl: abs(game.romUrl),
    biosUrl: abs(game.biosUrl || ''),
    gameName: game.nameCn || game.name,
    gameID: game.id,
    pathtodata: absData,
    volume,
    exitMessage: EXIT_MESSAGE,
  };
  const cfgJson = JSON.stringify(cfg).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>html,body{margin:0;width:100%;height:100%;background:#0e1419;overflow:hidden}#game{width:100%;height:100%}</style>
</head>
<body>
<div id="game"></div>
<script>
  var C = ${cfgJson};
  window.EJS_player = C.player;
  window.EJS_core = C.core;
  window.EJS_gameUrl = C.gameUrl;
  window.EJS_biosUrl = C.biosUrl;
  window.EJS_gameName = C.gameName;
  window.EJS_gameID = C.gameID;
  window.EJS_pathtodata = C.pathtodata;
  window.EJS_startOnLoaded = true;
  window.EJS_volume = C.volume;
  window.EJS_color = '#1a9fff';
  window.EJS_backgroundColor = '#0e1419';
  window.EJS_ready = function () {
    try {
      window.EJS_emulator.on('exit', function () {
        parent.postMessage({ type: C.exitMessage }, '*');
      });
    } catch (e) {}
  };
</script>
<script src="${loaderUrl}"></script>
</body>
</html>`;
}

export function EmulatorPlayer({ game, dataPath, volume = 0.5, onExit }: EmulatorPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Resolve the effective engine-data path: use the configured one if its
  // loader.js is real JS, otherwise fall back to the CDN. This rescues a
  // self-host setting when no data has been placed under /emulatorjs/data/.
  const [effectivePath, setEffectivePath] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setEffectivePath(null);
    (async () => {
      const ok = await loaderIsValid(dataPath);
      if (!cancelled) setEffectivePath(ok ? dataPath : CDN_DATA);
    })();
    return () => {
      cancelled = true;
    };
  }, [dataPath, game.id]);

  // Keep the latest onExit without re-running the message listener effect.
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  // Listen for the iframe's exit postMessage (EmulatorJS "Exit Emulation").
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data && (e.data as { type?: string }).type === EXIT_MESSAGE) {
        onExitRef.current?.();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Register the iframe window with the bridge so the in-game menu can reach
  // the live EJS_emulator; clear it on unmount (iframe is destroyed with it).
  useEffect(() => {
    const win = iframeRef.current?.contentWindow ?? null;
    setEmulatorWindow(win);
    return () => setEmulatorWindow(null);
    // Re-bind whenever the game changes (the iframe reloads via its key).
  }, [game.id]);

  if (!effectivePath) {
    return <div className="h-full w-full bg-black" />;
  }

  return (
    <iframe
      key={game.id + effectivePath}
      ref={iframeRef}
      title={game.nameCn || game.name}
      className="h-full w-full border-0 bg-black"
      // Same-origin srcDoc: relative ROM URLs resolve against the parent origin,
      // and the parent can read contentWindow.EJS_emulator for save/load.
      srcDoc={buildSrcDoc(game, effectivePath, volume)}
      allow="autoplay; gamepad; fullscreen"
      onLoad={() => setEmulatorWindow(iframeRef.current?.contentWindow ?? null)}
    />
  );
}
