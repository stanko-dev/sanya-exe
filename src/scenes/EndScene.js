import Phaser from 'phaser';
import { levels, menuMedia } from '../config/levels.js';
import { memeContent } from '../config/memes.js';
import { school } from '../lib/art.js';
import { music, mediaUrl, mediaExists } from '../lib/media.js';
import { menuPlaybackIntent } from '../lib/playbackIntent.js';
import { attachFinalCelebration } from '../lib/finalCelebration.js';
import { mount, on, escapeHtml } from '../lib/ui.js';

export class EndScene extends Phaser.Scene {
  constructor() { super('End'); }
  init({ won = false, levelIndex = 0, trap = null } = {}) { this.won = won; this.levelIndex = levelIndex; this.trap = trap; }
  create() {
    school(this, levels[0].obstacles, { menu: true, animate: !this.won });
    this.add.rectangle(640, 400, 1280, 800, 0x11161f, 0.75);
    const personal = !this.won && this.trap && (this.textures.exists(this.trap.photo) || this.cache.audio.exists(this.trap.sound));
    if (personal) {
      this.sound.stopAll();
      if (this.cache.audio.exists(this.trap.sound)) {
        const sound = this.sound.add(this.trap.sound, { volume: 0.7 }); sound.play();
        this.events.once('shutdown', () => { sound.stop(); sound.destroy(); });
      }
    } else if (this.won) {
      if (menuPlaybackIntent.canAutoplay()) music(this, memeContent.final.soundtrack);
      else this.sound.stopAll();
    } else if (menuPlaybackIntent.canAutoplay()) music(this, menuMedia.soundtrack);
    else this.sound.stopAll();
    if (this.won) {
      const stage = document.getElementById('stage');
      stage.classList.add('final-stage');
      this.events.once('shutdown', () => stage.classList.remove('final-stage'));
      const mainPhoto = mediaExists('final/main.jpg') ? `<img class="final-main-photo" src="${mediaUrl('final/main.jpg')}" alt="НАФОР">` : '';
      mount(this, `<div class="final-fall" aria-hidden="true"></div><section class="end-screen final-screen" aria-label="Фінальне привітання" tabindex="0"><header class="final-heading"><span class="eyebrow">${memeContent.final.title}</span><h2>${memeContent.final.greeting}</h2></header><figure class="final-portrait">${mainPhoto}<figcaption class="final-completed">${memeContent.ui.completed}</figcaption></figure><div class="friends-slot"><p class="final-friends"></p></div><nav class="final-actions" aria-label="Дії після фіналу"><button id="restart" class="primary">${memeContent.ui.restart}</button><button id="menu" class="text-button">В МЕНЮ</button></nav></section>`);
      attachFinalCelebration(this);
    } else {
      mount(this, `<section class="end-screen defeat-screen"><div class="end-symbol">↻</div><span class="eyebrow">ПОШЛА ВОЗНЯ</span><h2>${memeContent.ui.defeat}</h2><p>${personal ? escapeHtml(this.trap.message) : 'ПЕТРОВИЧ ЧЕКАЄ. БАБАНА НЕ ЗАКІНЧИЛАСЬ.'}</p><button id="restart" class="primary">${memeContent.ui.restart} <span class="button-arrow">↗</span></button><button id="menu" class="text-button">В МЕНЮ</button></section>`);
      if (personal) document.querySelector('.end-screen').classList.add('trap-defeat');
      if (personal && this.textures.exists(this.trap.photo)) {
        const image = document.createElement('img'); image.src = mediaUrl(this.trap.photo);
        image.alt = this.trap.message; image.className = 'trap-photo';
        document.querySelector('.end-symbol').replaceWith(image);
      }
    }
    const restart = () => this.scene.start('Game', { levelIndex: this.won ? 0 : this.levelIndex });
    on('restart', restart); on('menu', () => this.scene.start('Menu'));
    this.input.keyboard.once('keydown-R', restart);
  }
}
