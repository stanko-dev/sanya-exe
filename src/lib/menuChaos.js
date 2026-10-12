import Phaser from 'phaser';
import { memeContent, memeCombination } from '../config/memes.js';
import { enemyTypes } from '../config/levels.js';

export const chaosWords = memeContent.words;
export const chaosLimits = { maxElements: 18, intervalMs: 700 };
const colors = ['#c9ff64', '#ff94d5', '#ad9aff', '#ffb76e', '#7be3d1'];

export function attachMenuChaos(scene) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const items = new Set();
  let timer;
  const clear = () => {
    for (const item of items) { scene.tweens.killTweensOf(item); item.destroy(); }
    items.clear();
  };
  const spawn = (staticIndex = null, startY = -100) => {
    if (items.size >= chaosLimits.maxElements) return;
    const type = Phaser.Utils.Array.GetRandom(Object.values(enemyTypes));
    const photo = Math.random() < 0.45 && scene.textures.exists(type.face);
    const item = photo ? scene.add.image(0, 0, type.face)
      : scene.add.text(0, 0, (Math.random() < 0.25 ? memeCombination() : Phaser.Utils.Array.GetRandom(chaosWords)), { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: `${Phaser.Math.Between(32, 66)}px`, fontStyle: 'bold', color: Phaser.Utils.Array.GetRandom(colors), stroke: '#111820', strokeThickness: 5 }).setOrigin(0.5);
    if (photo) item.setScale(Math.min(125 / item.width, 145 / item.height));
    const baseScale = item.scaleX;
    const x = Phaser.Math.Between(80, 1200);
    item.setPosition(x, staticIndex === null ? startY : 180 + staticIndex * 85)
      .setAngle(Phaser.Math.Between(-35, 35)).setAlpha(photo ? 0.8 : 0.7).setDepth(1);
    items.add(item);
    if (staticIndex !== null) return;
    const duration = Phaser.Math.Between(6500, 10000), bounce = Math.random() < 0.3;
    scene.tweens.add({
      targets: item, x: Phaser.Math.Clamp(x + Phaser.Math.Between(-190, 190), 50, 1230), y: 920,
      angle: item.angle + Phaser.Math.Between(-220, 220), scale: baseScale * Phaser.Math.FloatBetween(0.75, 1.4),
      duration, ease: bounce ? 'Bounce.Out' : 'Sine.In',
      onComplete: () => { items.delete(item); item.destroy(); },
    });
    scene.tweens.add({ targets: item, alpha: 0, delay: duration - 1000, duration: 1000 });
    if (!photo) scene.time.delayedCall(duration / 2, () => { if (item.active) item.setColor(Phaser.Utils.Array.GetRandom(colors)); });
  };
  const reset = () => {
    clear(); timer?.remove();
    if (motion.matches) { for (let i = 0; i < 5; i++) spawn(i); return; }
    for (let i = 0; i < 6; i++) spawn(null, Phaser.Math.Between(80, 620));
    timer = scene.time.addEvent({ delay: chaosLimits.intervalMs, loop: true, callback: () => spawn() });
  };
  reset(); motion.addEventListener('change', reset);
  scene.events.once('shutdown', () => { motion.removeEventListener('change', reset); timer?.remove(); clear(); });
}
