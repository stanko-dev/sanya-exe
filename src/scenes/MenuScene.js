import Phaser from 'phaser';
import { memeContent, memeCombination } from '../config/memes.js';
import { attachRotatingTitle } from '../lib/rotatingTitle.js';
import { levels, menuMedia } from '../config/levels.js';
import { school } from '../lib/art.js';
import { attachMenuPlayer } from '../lib/menuPlayer.js';
import { attachMenuChaos } from '../lib/menuChaos.js';
import { mount, on, volumeControl, volumeHtml, controlsHtml } from '../lib/ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    school(this, levels[0].obstacles, { menu: true, animate: false });
    if (this.textures.exists(menuMedia.background)) this.add.image(640, 400, menuMedia.background).setDisplaySize(1280, 800).setAlpha(0.55);
    attachMenuChaos(this);
    this.sound.stopAll();
    mount(this, `<div class="menu"><div class="eyebrow"><span class="tiny-square"></span> ${memeCombination()}</div><h1 id="meme-title">mamyn_selyk</h1><div class="title-tag">${memeContent.subtitle}</div><p class="intro">${memeCombination()}<br>${memeCombination()}</p><button id="start" class="primary"><span class="play">▶</span> ${memeContent.ui.start} <span class="button-arrow">↗</span></button><button id="controls" class="secondary"><span>⌘</span> ${memeContent.ui.controls} <span class="button-arrow">+</span></button>${volumeHtml}<div class="menu-bottom"><span class="status-dot"></span> ${memeCombination()}</div></div><div class="edition"><span>НАФОР EDITION</span><strong>${memeCombination()}</strong><small>03 ПАЛАТИ <b>·</b> ПОВНИЙ БАК ВОЗНІ</small></div><div class="level-strip"><span class="strip-label">ТВІЙ МАРШРУТ</span><span><b>01</b> БАБАНА</span><i>→</i><span><b>02</b> ПЕТРОВИЧ</span><i>→</i><span><b>03</b> ВИСЕМИР</span><span class="strip-star">✳</span></div><div id="modal"></div>`);
    on('start', () => this.scene.start('Game', { levelIndex: 0 }));
    on('controls', () => {
      document.getElementById('modal').innerHTML = `<div class="modal-backdrop"><section class="dialog"><span class="eyebrow">ШПАРГАЛКА</span><h2>Як тут вижити?</h2>${controlsHtml}<p class="small-note">Влучай конфеті в суперників. Коли всі підуть на перерву, зелений вихід угорі відкриється.</p><button id="close" class="primary">Зрозуміло, погнали ↗</button></section></div>`;
      on('close', () => { document.getElementById('modal').innerHTML = ''; });
      document.getElementById('close').focus();
    });
    attachRotatingTitle(this);
    volumeControl(this);
    attachMenuPlayer(this, menuMedia.soundtrack);
  }
}
