import Phaser from 'phaser';
import { levels, menuMedia } from '../config/levels.js';
import { school } from '../lib/art.js';
import { attachMenuPlayer } from '../lib/menuPlayer.js';
import { mount, on, volumeControl, volumeHtml, controlsHtml } from '../lib/ui.js';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }
  create() {
    school(this, levels[0].obstacles, { menu: true });
    if (this.textures.exists(menuMedia.background)) this.add.image(640, 400, menuMedia.background).setDisplaySize(1280, 800).setAlpha(0.55);
    this.sound.stopAll();
    mount(this, `<div class="menu"><div class="eyebrow"><span class="tiny-square"></span> ОСОБЛИВА МІСІЯ ДЛЯ ОСОБЛИВОЇ ЛЮДИНИ</div><h1>sanya<span>.exe</span><i>_</i></h1><div class="title-tag">ОСТАННІЙ ДЗВОНИК</div><p class="intro">Школа. Друзі. Трохи хаосу.<br>Три рівні до звання легенди.</p><button id="start" class="primary"><span class="play">▶</span> Start game <span class="button-arrow">↗</span></button><button id="controls" class="secondary"><span>⌘</span> Controls <span class="button-arrow">+</span></button>${volumeHtml}<div class="menu-bottom"><span class="status-dot"></span> БЕЗ КРОВІ. З ЛЮБОВ’Ю. ТА КОНФЕТІ.</div></div><div class="edition"><span>THE SCHOOL EDITION</span><strong>Не запізнись<br>на власне свято.</strong><small>03 РІВНІ <b>·</b> 01 ЛЕГЕНДА <b>·</b> БЕЗЛІМІТ КОНФЕТІ</small></div><div class="level-strip"><span class="strip-label">ТВІЙ МАРШРУТ</span><span><b>01</b> Перший дзвоник</span><i>→</i><span><b>02</b> Велика перерва</span><i>→</i><span><b>03</b> Останній дзвоник</span><span class="strip-star">✳</span></div><div id="modal"></div>`);
    on('start', () => this.scene.start('Game', { levelIndex: 0 }));
    on('controls', () => {
      document.getElementById('modal').innerHTML = `<div class="modal-backdrop"><section class="dialog"><span class="eyebrow">ШПАРГАЛКА</span><h2>Як тут вижити?</h2>${controlsHtml}<p class="small-note">Влучай конфеті в суперників. Коли всі підуть на перерву, зелений вихід угорі відкриється.</p><button id="close" class="primary">Зрозуміло, погнали ↗</button></section></div>`;
      on('close', () => { document.getElementById('modal').innerHTML = ''; });
      document.getElementById('close').focus();
    });
    volumeControl(this);
    attachMenuPlayer(this, menuMedia.soundtrack);
  }
}
