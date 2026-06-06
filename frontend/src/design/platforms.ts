// Platform metadata: display labels and EmulatorJS core mapping.
// GB and GBC share the gambatte `gb` core.

export interface PlatformMeta {
  /** Platform id stored on Game.platform. */
  id: string;
  /** Short display label for tabs / badges. */
  label: string;
  /** EmulatorJS EJS_core value. */
  core: string;
}

export const PLATFORMS: PlatformMeta[] = [
  { id: 'nes', label: 'NES', core: 'nes' },
  { id: 'snes', label: 'SNES', core: 'snes' },
  { id: 'gba', label: 'GBA', core: 'gba' },
  { id: 'gb', label: 'GB / GBC', core: 'gb' },
];

const byId = new Map(PLATFORMS.map((p) => [p.id, p]));

/** Returns metadata for a platform id, or a synthesized fallback. */
export function platformMeta(id: string): PlatformMeta {
  return byId.get(id) ?? { id, label: id.toUpperCase(), core: id };
}
