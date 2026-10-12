import Phaser from 'phaser';
import { memeContent } from '../config/memes.js';
import { levels, menuMedia, enemyTypes } from '../config/levels.js';
import { queueImage, queueAudio, finalPhotoPaths } from '../lib/media.js';
import { createTextures } from '../lib/art.js';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    finalPhotoPaths().forEach(path => queueImage(this, path));
    queueAudio(this, memeContent.final.soundtrack);
    queueImage(this, menuMedia.background); queueAudio(this, menuMedia.soundtrack);
    Object.values(enemyTypes).forEach(type => { queueImage(this, type.face); queueAudio(this, type.inputSound); });
    levels.forEach(level => {
      queueImage(this, level.rewardPhoto); queueAudio(this, level.soundtrack);
      level.enemies.forEach(type => {
        queueAudio(this, type.media.outputSound);
      });
      (level.traps ?? []).forEach(trap => { queueImage(this, trap.photo); queueAudio(this, trap.sound); });
    });
    this.load.on('loaderror', file => console.warn(`Не вдалося завантажити ${file.key}; використовується заглушка.`));
  }
  create() {
    createTextures(this);
    let volume = 65;
    try { const saved = localStorage.getItem('sanya-volume'); if (saved !== null && Number.isFinite(Number(saved))) volume = Phaser.Math.Clamp(Number(saved), 0, 100); } catch { /* Use default. */ }
    this.sound.volume = volume / 100;
    this.scene.start('Menu');
  }
}
