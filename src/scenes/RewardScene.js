import Phaser from 'phaser';
import { levels } from '../config/levels.js';
import { school, confetti } from '../lib/art.js';
import { mount, on, escapeHtml } from '../lib/ui.js';
import { mediaUrl } from '../lib/media.js';

export class RewardScene extends Phaser.Scene {
  constructor() { super('Reward'); }
  init(data) { this.result = data; }
  create() {
    const level = levels[this.result.levelIndex];
    school(this, level.obstacles, { menu: true });
    const photo = this.textures.exists(level.rewardPhoto)
      ? `<img src="${mediaUrl(level.rewardPhoto)}" alt="Святкове фото після рівня ${level.id}" />`
      : `<div class="photo-placeholder"><div class="photo-doodle">✌</div><strong>ТУТ БУДЕ<br>НАШЕ ФОТО</strong><span>А поки — уяви найкраще селфі.</span><i>★</i></div>`;
    mount(this, `<div class="reward-layout"><div class="polaroid">${photo}<div class="photo-caption">наша команда, наші пригоди ♡</div></div><section class="reward-copy"><span class="eyebrow"><span class="status-dot"></span> РІВЕНЬ 0${level.id} ПРОЙДЕНО</span><h2>${escapeHtml(level.rewardTitle)}</h2><p>${escapeHtml(level.wish)}</p><div class="stats"><div><strong>${this.result.seconds}с</strong><span>ЧАС РІВНЯ</span></div><div><strong>${this.result.accuracy}%</strong><span>ВЛУЧНІСТЬ</span></div><div><strong>${level.enemies.reduce((s, e) => s + e.count, 0)}</strong><span>НА ПЕРЕРВІ</span></div></div><button id="next" class="primary">${this.result.levelIndex === levels.length - 1 ? 'Забрати привітання' : 'Наступний рівень'} <span class="button-arrow">↗</span></button><button id="menu" class="text-button">Повернутися в меню</button></section></div>`);
    on('next', () => this.result.levelIndex + 1 < levels.length ? this.scene.start('Game', { levelIndex: this.result.levelIndex + 1 }) : this.scene.start('End', { won: true }));
    on('menu', () => this.scene.start('Menu'));
    this.time.addEvent({ delay: 900, repeat: 6, callback: () => confetti(this, Phaser.Math.Between(100, 1180), Phaser.Math.Between(80, 700), 14) });
  }
}
