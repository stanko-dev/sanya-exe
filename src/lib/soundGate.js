// A single gate is shared by all enemies and levels, keyed by global type id.
export class SoundGate {
  constructor(cooldownMs = 1700) { this.cooldownMs = cooldownMs; this.entries = new Map(); }
  canPlay(id, now) {
    const entry = this.entries.get(id);
    return !entry || (now >= entry.nextAt && !entry.sound?.isPlaying && !entry.sound?.isPaused);
  }
  record(id, now, sound) { this.entries.set(id, { nextAt: now + this.cooldownMs, sound }); }
  release(sound) {
    for (const entry of this.entries.values()) if (entry.sound === sound) entry.sound = null;
  }
}
