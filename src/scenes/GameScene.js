import Phaser from 'phaser';
import { MemeTextManager } from '../lib/MemeTextManager.js';
import { levels, playerConfig as cfg, enemyVisualConfig as visual } from '../config/levels.js';
import { school, confetti } from '../lib/art.js';
import { makeGrid, findPath } from '../lib/navigation.js';
import { music, playSound, playHitSound } from '../lib/media.js';
import { TrapState, trapContains, damageResult } from '../lib/traps.js';
import { mount, on, escapeHtml, volumeHtml, volumeControl } from '../lib/ui.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }
  init({ levelIndex = 0 } = {}) { this.levelIndex = levelIndex; }
  create() {
    this.level = levels[this.levelIndex];
    this.hp = cfg.hp; this.nextShot = 0; this.invulnerableUntil = 0;
    this.finished = false; this.paused = false; this.cleared = false;
    this.combatTime = 0;
    this.startedAt = this.time.now; this.shots = 0; this.hits = 0;
    this.kills = 0;
    this.memeTexts = new MemeTextManager(this);
    this.total = this.level.enemies.reduce((sum, type) => sum + type.count, 0);
    school(this, this.level.obstacles);
    music(this, this.level.soundtrack);
    this.physics.world.setBounds(90, 112, 1100, 622);
    this.solids = this.physics.add.staticGroup();
    const addSolid = (x, y, w, h) => {
      const rect = this.add.rectangle(x, y, w, h, 0xffffff, 0);
      this.physics.add.existing(rect, true); this.solids.add(rect); return rect;
    };
    this.level.obstacles.forEach(o => addSolid(o.x, o.y, o.w, o.h));
    this.door = this.add.rectangle(640, 122, 100, 24, 0xb66d63).setStrokeStyle(3, 0x181e27);
    this.doorText = this.add.text(640, 92, 'ВИХІД · ЗАЧИНЕНО', { fontFamily: 'monospace', fontSize: '12px', color: '#dba99a' }).setOrigin(0.5);
    this.doorBody = addSolid(640, 122, 100, 24);
    this.exit = this.add.zone(640, 121, 100, 38); this.physics.add.existing(this.exit, true);
    this.grid = makeGrid(this.level.obstacles);
    // Floor hazards have no physics bodies: no changes to solids or BFS.
    this.traps = (this.level.traps ?? []).map(config => ({
      config, state: new TrapState(config),
      visual: this.add.rectangle(config.x, config.y, config.width, config.height, 0xffb65c, 0.2).setStrokeStyle(2, 0xffb65c, 0.6),
      label: this.add.text(config.x, config.y, '!', { fontFamily: 'monospace', fontSize: '22px', color: '#ffb65c' }).setOrigin(0.5),
      blink: null,
    }));
    this.player = this.physics.add.image(640, 692, 'player').setDisplaySize(49, 49).setCollideWorldBounds(true).setDepth(100);
    this.player.body.setCircle(17, 15, 15);
    this.enemies = this.physics.add.group();
    this.bullets = this.physics.add.group({ maxSize: 90 });
    this.healthBars = this.add.graphics().setDepth(2200);
    let serial = 0;
    this.level.enemies.forEach(type => {
      for (let i = 0; i < type.count; i++) {
        const pos = this.spawnPosition(serial++);
        const hasPhoto = this.textures.exists(type.media.face);
        const texture = hasPhoto ? `enemy-body-${type.id}` : `enemy-${type.id}`;
        const enemy = this.enemies.create(pos.x, pos.y, texture).setDisplaySize(visual.bodySize, visual.bodySize).setCollideWorldBounds(true);
        enemy.body.setSize(visual.hitboxSize / enemy.scaleX, visual.hitboxSize / enemy.scaleY, true);
        enemy.body.updateFromGameObject();
        if (hasPhoto) {
          enemy.head = this.add.image(pos.x, pos.y, type.media.face);
          enemy.head.setScale(Math.min(visual.headWidth / enemy.head.width, visual.headHeight / enemy.head.height));
          enemy.once('destroy', () => enemy.head?.destroy());
        }
        enemy.stats = type; enemy.hp = type.hp; enemy.nextAttack = 0;
        enemy.nextPath = this.time.now + serial * 47; enemy.path = [];
        enemy.setBounce(0.1);
      }
    });
    const syncHeads = () => this.enemies.getChildren().forEach(enemy => {
      if (!enemy.head) return;
      const a = enemy.rotation;
      enemy.head.setPosition(enemy.x + Math.sin(a) * visual.headOffset, enemy.y - Math.cos(a) * visual.headOffset)
        .setRotation(a).setDepth(1000 + enemy.depth);
    });
    this.events.on('postupdate', syncHeads);
    this.events.once('shutdown', () => this.events.off('postupdate', syncHeads));
    syncHeads();
    this.physics.add.collider(this.player, this.solids);
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.bullets, this.solids, bullet => this.recycleBullet(bullet));
    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => this.hitEnemy(bullet, enemy));
    this.physics.add.overlap(this.player, this.enemies, (_, enemy) => this.hitPlayer(enemy));
    this.physics.add.overlap(this.player, this.exit, () => {
      if (this.cleared && !this.finished) {
        this.finished = true;
        this.scene.start('Reward', { levelIndex: this.levelIndex, seconds: Math.round((this.time.now - this.startedAt) / 1000), accuracy: this.shots ? Math.round(this.hits / this.shots * 100) : 0 });
      }
    });
    this.keys = this.input.keyboard.addKeys('W,A,S,D,ESC,R');
    this.input.keyboard.addCapture(['W', 'A', 'S', 'D', 'ESC']);
    this.input.mouse.disableContextMenu();
    this.crosshair = this.add.container(640, 400, [
      this.add.circle(0, 0, 9).setStrokeStyle(1, 0xc9ff64, 0.9),
      this.add.rectangle(0, 0, 3, 3, 0xc9ff64),
      this.add.rectangle(-14, 0, 5, 1, 0xc9ff64), this.add.rectangle(14, 0, 5, 1, 0xc9ff64),
      this.add.rectangle(0, -14, 1, 5, 0xc9ff64), this.add.rectangle(0, 14, 1, 5, 0xc9ff64),
    ]).setDepth(4000);
    document.querySelector('#game').classList.add('playing');
    this.events.once('shutdown', () => document.querySelector('#game').classList.remove('playing'));
    mount(this, `<div class="hud"><div class="hud-level"><span class="eyebrow">РІВЕНЬ 0${this.level.id} / 03</span><strong>${escapeHtml(this.level.title)}</strong></div><div class="hud-center"><span class="status-dot"></span> ${escapeHtml(this.level.room)}</div><div class="hud-health"><span>HP <b id="hp">${cfg.hp}</b></span><div class="health-track"><div id="health-fill"></div></div></div><button id="pause" class="icon-button" aria-label="Пауза">Ⅱ</button></div><div class="game-bottom"><div id="objective"><span class="tiny-square"></span> ВІДПРАВ УСІХ НА ПЕРЕРВУ <b id="counter">0 / ${this.total}</b></div><span>WASD <i>РУХ</i> <span class="footer-divider">/</span> ЛКМ <i>КОНФЕТІ</i> <span class="footer-divider">/</span> ESC <i>ПАУЗА</i></span></div><div id="game-modal"></div>`);
    on('pause', () => this.togglePause());
    const intro = this.add.text(640, 395, this.level.subtitle, { fontFamily: 'monospace', fontSize: '17px', color: '#e9efdb', backgroundColor: '#111820', padding: { x: 18, y: 12 } }).setOrigin(0.5).setDepth(2500);
    this.tweens.add({ targets: intro, alpha: 0, y: 375, delay: 1800, duration: 400, onComplete: () => intro.destroy() });
    this.cameras.main.fadeIn(250, 17, 22, 31);
  }
  spawnPosition(index) {
    // Deterministic distributed spawns, checked against geometry and previous enemies.
    for (let attempt = 0; attempt < 400; attempt++) {
      const x = 144 + ((index * 173 + attempt * 97) % 990);
      const y = 190 + ((index * 113 + attempt * 71) % 410);
      if (this.level.obstacles.some(o => Math.abs(x - o.x) < o.w / 2 + 40 && Math.abs(y - o.y) < o.h / 2 + 45)) continue;
      if (this.enemies.getChildren().some(e => Phaser.Math.Distance.Between(x, y, e.x, e.y) < 65)) continue;
      return { x, y };
    }
    return { x: 160, y: 160 + index * 30 };
  }
  recycleBullet(bullet) { if (bullet.active) bullet.disableBody(true, true); }
  hitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active || this.finished) return;
    this.recycleBullet(bullet); this.hits++;
    enemy.hp -= cfg.damage;
    playHitSound(this, enemy.stats);
    confetti(this, enemy.x, enemy.y, 5);
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(80, () => { if (enemy.active) enemy.clearTint(); });
    if (enemy.hp <= 0) {
      confetti(this, enemy.x, enemy.y, 18);
      this.memeTexts.defeated(enemy.x, enemy.y);
      enemy.destroy(); this.kills++;
      document.getElementById('counter').textContent = `${this.kills} / ${this.total}`;
      if (this.kills === this.total) this.openExit();
    }
  }
  hitPlayer(enemy) {
    if (!enemy.active || this.finished || this.combatTime < enemy.nextAttack) return;
    if (this.takeDamage(enemy.stats.damage)) {
      enemy.nextAttack = this.combatTime + enemy.stats.attackCooldown;
      playSound(this, enemy.stats.media.outputSound);
    }
  }
  takeDamage(amount, trap = null) {
    if (this.finished) return false;
    const result = damageResult(this.hp, amount, this.combatTime, this.invulnerableUntil, cfg.invulnerability, trap?.type === 'instant_death');
    if (!result) return false;
    this.hp = result.hp; this.invulnerableUntil = result.invulnerableUntil;
    this.cameras.main.shake(90, 0.002);
    this.player.setTint(0xffb98c);
    this.time.delayedCall(150, () => this.player.clearTint());
    document.getElementById('hp').textContent = Math.ceil(this.hp);
    document.getElementById('health-fill').style.width = `${this.hp / cfg.hp * 100}%`;
    if (this.hp <= 0) {
      this.finished = true;
      this.scene.start('End', { won: false, levelIndex: this.levelIndex, trap });
    }
    return true;
  }
  updateTraps() {
    for (const trap of this.traps) {
      const event = trap.state.update(this.combatTime, trapContains(trap.config, this.player.body));
      if (event === 'warning') {
        trap.visual.setFillStyle(0xff4040, 0.75).setStrokeStyle(2, 0xff4040);
        trap.label.setColor('#ff7070');
        trap.blink = this.tweens.add({ targets: [trap.visual, trap.label], alpha: 0.25, duration: 100, yoyo: true, repeat: -1 });
      } else if (event === 'trigger' || event === 'cancel') {
        trap.blink?.stop(); trap.blink = null;
        trap.visual.setAlpha(0.2).setFillStyle(0x79838b, 0.3).setStrokeStyle(1, 0x79838b);
        trap.label.setAlpha(0.2);
        if (event === 'trigger') this.takeDamage(trap.config.damage, trap.config);
      } else if (trap.state.phase === 'idle') {
        trap.visual.setAlpha(1).setFillStyle(0xffb65c, 0.2).setStrokeStyle(2, 0xffb65c, 0.6);
        trap.label.setAlpha(1).setColor('#ffb65c');
      }
      if (this.finished) break;
    }
  }
  openExit() {
    this.cleared = true;
    this.solids.remove(this.doorBody, true, true);
    this.door.setFillStyle(0xc9ff64, 0.25).setStrokeStyle(2, 0xc9ff64);
    this.doorText.setText('↑ ВИХІД ВІДКРИТО ↑').setColor('#c9ff64');
    this.tweens.add({ targets: this.door, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });
    document.getElementById('objective').innerHTML = '<span class="status-dot"></span> КЛАС ПРИБРАНО! <b>ЙДИ ДО ВИХОДУ ↑</b>';
    confetti(this, 640, 170, 35);
  }
  shoot(time, angle) {
    if (time < this.nextShot) return;
    const bullet = this.bullets.get(this.player.x + Math.cos(angle) * 31, this.player.y + Math.sin(angle) * 31, 'bullet');
    if (!bullet) return;
    this.nextShot = time + cfg.fireDelay; this.shots++;
    bullet.enableBody(true, bullet.x, bullet.y, true, true).setRotation(angle).setDepth(1400);
    bullet.body.setSize(12, 6);
    this.physics.velocityFromRotation(angle, cfg.bulletSpeed, bullet.body.velocity);
    bullet.expires = time + 1300;
  }
  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    const modal = document.getElementById('game-modal');
    if (this.paused) {
      this.physics.pause(); this.tweens.pauseAll(); this.time.paused = true; this.crosshair.setVisible(false);
      modal.innerHTML = `<div class="modal-backdrop"><section class="dialog"><span class="eyebrow">ТЕХНІЧНА ПЕРЕРВА</span><h2>Видихни, Саня.</h2><p class="small-note">Твій клас зачекає.</p><button id="resume" class="primary">Продовжити ↗</button>${volumeHtml}<button id="quit" class="text-button">Повернутися в меню</button></section></div>`;
      on('resume', () => this.togglePause()); on('quit', () => { this.time.paused = false; this.scene.start('Menu'); });
      volumeControl(this);
    } else {
      this.physics.resume(); this.tweens.resumeAll(); this.time.paused = false; this.crosshair.setVisible(true); modal.innerHTML = '';
    }
  }
  update(time, delta) {
    if (!this.keys) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.togglePause();
    if (this.paused || this.finished) return;
    this.combatTime += delta;
    this.updateTraps();
    if (this.finished) return;
    const dx = Number(this.keys.D.isDown) - Number(this.keys.A.isDown);
    const dy = Number(this.keys.S.isDown) - Number(this.keys.W.isDown);
    this.player.setVelocity(dx, dy);
    if (dx || dy) this.player.body.velocity.normalize().scale(cfg.speed);
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
    this.player.setRotation(angle); this.player.setDepth(this.player.y);
    this.crosshair.setPosition(pointer.worldX, pointer.worldY);
    if (pointer.isDown && pointer.leftButtonDown()) this.shoot(time, angle);
    this.bullets.children.iterate(bullet => {
      if (bullet?.active && (time > bullet.expires || bullet.x < 90 || bullet.x > 1190 || bullet.y < 110 || bullet.y > 734)) this.recycleBullet(bullet);
    });
    this.healthBars.clear();
    this.enemies.getChildren().forEach(enemy => {
      if (time >= enemy.nextPath) {
        enemy.path = findPath(this.grid, enemy, this.player);
        enemy.nextPath = time + 450 + enemy.stats.id * 40;
      }
      while (enemy.path.length && Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.path[0].x, enemy.path[0].y) < 12) enemy.path.shift();
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      // Within a tile, direct pursuit avoids orbiting the player's cell center.
      const target = distance < 65 ? this.player : enemy.path[0];
      if (target) {
        const direction = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y);
        this.physics.velocityFromRotation(direction, enemy.stats.speed, enemy.body.velocity);
        enemy.setRotation(direction);
      } else enemy.setVelocity(0, 0);
      enemy.setDepth(enemy.y);
      if (enemy.hp < enemy.stats.hp) {
        this.healthBars.fillStyle(0x11161f).fillRoundedRect(enemy.x - 24, enemy.y - 84, 48, 5, 2);
        this.healthBars.fillStyle(enemy.stats.color).fillRoundedRect(enemy.x - 24, enemy.y - 84, 48 * enemy.hp / enemy.stats.hp, 5, 2);
      }
    });
  }
}
