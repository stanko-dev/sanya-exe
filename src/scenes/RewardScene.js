import Phaser from 'phaser';
import { levels } from '../config/levels.js';
import { memeContent } from '../config/memes.js';
import { school } from '../lib/art.js';
import { mount, on, escapeHtml } from '../lib/ui.js';
import { mediaExists, mediaUrl } from '../lib/media.js';
import { attachRewardVideo } from '../lib/rewardVideo.js';

export class RewardScene extends Phaser.Scene {
  constructor() { super('Reward'); }
  init(data) { this.result = data; }
  create() {
    const level = levels[this.result.levelIndex];
    const next = () => this.result.levelIndex + 1 < levels.length
      ? this.scene.start('Game', { levelIndex: this.result.levelIndex + 1 })
      : this.scene.start('End', { won: true });
    const message = escapeHtml(memeContent.rewards[this.result.levelIndex]);
    if (level.id === 1) {
      this.cameras.main.setBackgroundColor('#0b0e14');
      mount(this, `<div class="reward-layout reward-minimal"><div class="polaroid"><div class="photo-placeholder"><strong>ВОЗНЯ</strong></div></div><h2>${message}</h2><button id="next" class="reward-next" aria-label="${memeContent.ui.next}" title="${memeContent.ui.next}">→</button></div>`);
      const player = attachRewardVideo(this, level, { minimal: true });
      if (!player) document.querySelector('.polaroid').classList.add('missing-reward');
      on('next', next);
      return;
    }
    school(this, level.obstacles, { menu: true });
    const photo = mediaExists(level.rewardPhoto)
      ? `<img src="${mediaUrl(level.rewardPhoto)}" alt="Нагорода ${level.id}" />`
      : `<div class="photo-placeholder"><div class="photo-doodle">✳</div><strong>ПОВНИЙ БАК<br>ВОЗНЯ</strong><span>ПЕТРОВИЧ ЩЕ НЕ ЗАВАНТАЖИВ ФОТО</span></div>`;
    mount(this, `<div class="reward-layout"><div class="polaroid">${photo}</div><section class="reward-copy"><span class="eyebrow">ПАЛАТА 0${level.id} ЗАКРИТА</span><h2>${message}</h2><button id="next" class="primary">${memeContent.ui.next} <span class="button-arrow">↗</span></button><button id="menu" class="text-button">В МЕНЮ</button></section></div>`);
    on('next', next); on('menu', () => this.scene.start('Menu'));
    attachRewardVideo(this, level);
  }
}
