import { MemePhraseSequence } from '../config/memes.js';

export class MemeTextManager {
  constructor(scene) {
    this.scene = scene; this.sequence = new MemePhraseSequence(); this.labels = new Set();
    scene.events.once('shutdown', () => {
      for (const label of this.labels) { scene.tweens.killTweensOf(label); label.destroy(); }
      this.labels.clear();
    });
  }
  defeated(x, y) {
    const phrase = this.sequence.next();
    this.show(phrase.short, x, y - 35, false);
    if (phrase.large) this.show(phrase.large, x, y + 18, true);
  }
  show(text, x, y, large) {
    const scene = this.scene;
    // Bound concurrent messages and keep the whole label inside the playfield.
    if (this.labels.size >= 10) {
      const oldest = this.labels.values().next().value;
      scene.tweens.killTweensOf(oldest); oldest.destroy(); this.labels.delete(oldest);
    }
    const label = scene.add.text(x, y, text, {
      fontFamily: 'Arial, sans-serif', fontSize: large ? '17px' : '15px', fontStyle: 'bold',
      color: large ? '#ff94d5' : '#c9ff64', backgroundColor: '#151b23',
      padding: { x: 8, y: 5 }, wordWrap: { width: large ? 330 : 230 }, align: 'center',
    }).setOrigin(0.5).setDepth(2600);
    label.x = Math.max(100 + label.width / 2, Math.min(1180 - label.width / 2, x));
    label.y = Math.max(145 + label.height / 2, Math.min(720 - label.height / 2, y));
    this.labels.add(label);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scene.tweens.add({ targets: label, y: label.y - (reduced ? 0 : 15), alpha: 0,
      delay: 1000, duration: reduced ? 0 : 600,
      onComplete: () => { this.labels.delete(label); label.destroy(); } });
  }
}
