import Phaser from 'phaser';
import { levels, menuMedia } from '../config/levels.js';
import { school, confetti } from '../lib/art.js';
import { music, mediaUrl } from '../lib/media.js';
import { mount, on } from '../lib/ui.js';

export class EndScene extends Phaser.Scene {
  constructor() { super('End'); }
  init({ won = false, levelIndex = 0, trap = null } = {}) { this.won = won; this.levelIndex = levelIndex; this.trap = trap; }
  create() {
    school(this, levels[0].obstacles, { menu: true });
    this.add.rectangle(640, 400, 1280, 800, 0x11161f, 0.75);
    const personal = !this.won && this.trap && (this.textures.exists(this.trap.photo) || this.cache.audio.exists(this.trap.sound));
    if (personal) {
      this.sound.stopAll();
      if (this.cache.audio.exists(this.trap.sound)) {
        const sound = this.sound.add(this.trap.sound, { volume: 0.7 }); sound.play();
        this.events.once('shutdown', () => { sound.stop(); sound.destroy(); });
      }
    } else music(this, menuMedia.soundtrack);
    mount(this, `<section class="end-screen"><div class="end-symbol">${this.won ? '✳' : '↻'}</div><span class="eyebrow">${this.won ? 'УСІ РІВНІ ПРОЙДЕНО · ЛЕГЕНДУ ПІДТВЕРДЖЕНО' : 'ЦЕ БУЛА РЕПЕТИЦІЯ'}</span><h2>${this.won ? 'З твоїм днем,<br><em>Саня!</em>' : 'На перездачу?<br><em>Легко.</em>'}</h2><p>${this.won ? 'Нехай у житті буде більше перемог, ніж домашніх завдань.<br>Мрій. Смійся. Створюй власні правила.<br>Твоя команда завжди поруч ♡' : 'Навіть легендам іноді потрібна друга спроба.<br>Рухайся, обходь парти й тримай дистанцію.'}</p><button id="restart" class="primary">${this.won ? 'Ще одна пригода' : 'Restart · Спробувати ще'} <span class="button-arrow">↗</span></button><button id="menu" class="text-button">Головне меню</button><small>${this.won ? 'З ЛЮБОВ’Ю ВІД ТВОЇХ ДРУЗІВ' : `ПРОГРЕС: РІВЕНЬ ${this.levelIndex + 1} / 3 · ПЕРЕЗАПУСК ЦЬОГО РІВНЯ`}</small></section>`);
    const restart = () => this.scene.start('Game', { levelIndex: this.won ? 0 : this.levelIndex });
    if (personal) {
      const screen = document.querySelector('.end-screen'); screen.classList.add('trap-defeat');
      screen.querySelector('h2').textContent = 'Пастка спрацювала!';
      screen.querySelector('p').textContent = this.trap.message;
      screen.querySelector('.eyebrow').textContent = `ПАСТКА · ${this.trap.id}`;
      if (this.textures.exists(this.trap.photo)) {
        const image = document.createElement('img'); image.src = mediaUrl(this.trap.photo);
        image.alt = this.trap.message; image.className = 'trap-photo';
        screen.querySelector('.end-symbol').replaceWith(image);
      }
    }
    on('restart', restart); on('menu', () => this.scene.start('Menu'));
    this.input.keyboard.once('keydown-R', restart);
    if (this.won) this.time.addEvent({ delay: 450, loop: true, callback: () => confetti(this, Phaser.Math.Between(80, 1200), Phaser.Math.Between(60, 720), 22) });
  }
}
