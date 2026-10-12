// Explicit Pause survives scene re-entry and reload; only Play clears it.
export class PlaybackIntent {
  constructor(storage = null) {
    this.storage = storage; this.manuallyPaused = false;
    try { this.manuallyPaused = storage?.getItem('sanya-music-paused') === 'true'; } catch { /* Optional storage. */ }
  }
  pause() { this.manuallyPaused = true; this.save(); }
  play() { this.manuallyPaused = false; this.save(); }
  save() { try { this.storage?.setItem('sanya-music-paused', String(this.manuallyPaused)); } catch { /* Optional storage. */ } }
  canAutoplay() { return !this.manuallyPaused; }
}
let storage = null;
try { storage = globalThis.localStorage ?? null; } catch { /* Restricted browser storage. */ }
export const menuPlaybackIntent = new PlaybackIntent(storage);
