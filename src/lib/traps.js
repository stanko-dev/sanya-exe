// Pure timing state, independent of rendering, physics and media.
export class TrapState {
  constructor(config) { this.config = config; this.phase = 'idle'; this.deadline = 0; }
  update(now, inside) {
    if (this.phase === 'warning') {
      if (now < this.deadline) return null;
      this.phase = 'cooldown'; this.deadline = now + this.config.cooldownMs;
      return inside ? 'trigger' : 'cancel';
    }
    if (this.phase === 'cooldown') {
      if (now < this.deadline) return null;
      this.phase = 'idle';
    }
    if (inside) {
      this.phase = 'warning'; this.deadline = now + this.config.warningMs;
      return 'warning';
    }
    return null;
  }
}
export function trapContains(trap, body) {
  return body.right > trap.x - trap.width / 2 && body.left < trap.x + trap.width / 2
    && body.bottom > trap.y - trap.height / 2 && body.top < trap.y + trap.height / 2;
}
export function damageResult(hp, amount, now, invulnerableUntil, invulnerabilityMs, instantDeath = false) {
  if (now < invulnerableUntil) return null;
  return { hp: instantDeath ? 0 : Math.max(0, hp - amount), invulnerableUntil: now + invulnerabilityMs };
}
