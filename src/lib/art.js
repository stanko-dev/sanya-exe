import Phaser from 'phaser';

export function createTextures(scene) {
  const make = (key, w, h, draw) => {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g); g.generateTexture(key, w, h); g.destroy();
  };
  const character = (key, color, player = false, bodyOnly = false) => make(key, 64, 64, g => {
    g.fillStyle(0x080c13, 0.35).fillEllipse(32, 48, 44, 19);
    g.fillStyle(0x151a23).fillRoundedRect(13, 17, 38, 36, 13);
    g.fillStyle(color).fillRoundedRect(15, 17, 34, 31, 12);
    if (!bodyOnly) {
    g.fillStyle(0xffdbb1).fillCircle(32, 23, 13);
    g.fillStyle(player ? 0x40334c : 0x403039).fillRoundedRect(19, 10, 26, 12, 5);
    g.fillStyle(0x202634).fillCircle(38, 23, 2).fillCircle(29, 23, 2);
    g.lineStyle(2, 0xb57364).lineBetween(32, 30, 37, 30);
    }
    if (player) {
      g.fillStyle(0xc9ff64).fillRect(19, 8, 27, 7);
      g.fillStyle(0xe8edf2).fillRoundedRect(41, 32, 21, 9, 3);
      g.fillStyle(0xffa770).fillRect(57, 32, 5, 9);
    } else {
      g.fillStyle(0xffffff, 0.7).fillRect(26, 38, 12, 3);
    }
  });
  character('player', 0x87995d, true);
  [0xad9aff, 0xffa770, 0x7be3d1].forEach((color, i) => {
    character(`enemy-${i + 1}`, color);
    character(`enemy-body-${i + 1}`, color, false, true);
  });
  make('bullet', 16, 8, g => g.fillStyle(0xf0ffb2).fillRoundedRect(0, 0, 16, 8, 4));
  make('spark', 8, 8, g => g.fillStyle(0xffffff).fillRect(0, 0, 8, 8));
}

export function school(scene, obstacles = [], { menu = false, animate = true } = {}) {
  const g = scene.add.graphics();
  g.fillStyle(0x171e28).fillRect(0, 0, 1280, 800);
  g.fillStyle(0x29333c).fillRect(76, 96, 1128, 650);
  for (let x = 80; x < 1200; x += 40) for (let y = 100; y < 740; y += 40) {
    g.fillStyle(((x + y) / 40) % 2 === 0 ? 0x303b43 : 0x2b353e).fillRect(x, y, 39, 39);
    if ((x + y) % 120 === 0) g.fillStyle(0x52605a, 0.12).fillRect(x + 7, y + 7, 26, 26);
  }
  g.fillStyle(0x101720).fillRect(70, 80, 1140, 25).fillRect(70, 735, 1140, 25).fillRect(65, 80, 25, 680).fillRect(1190, 80, 25, 680);
  g.fillStyle(0x708173).fillRect(90, 105, 1100, 8);
  // Chalkboards, windows, lockers and chalk scribbles.
  g.fillStyle(0x9e866b).fillRoundedRect(310, 115, 170, 54, 3).fillRoundedRect(800, 115, 170, 54, 3);
  g.fillStyle(0x234d47).fillRect(316, 121, 158, 42).fillRect(806, 121, 158, 42);
  g.lineStyle(2, 0xaacbb0, 0.65);
  [330, 820].forEach(x => { g.lineBetween(x, 138, x + 80, 138); g.lineBetween(x, 149, x + 45, 149); });
  for (let y = 210; y < 640; y += 170) {
    g.fillStyle(0x151f2a).fillRect(89, y, 16, 95).fillRect(1175, y, 16, 95);
    g.fillStyle(0x86b7c0, 0.45).fillRect(90, y + 5, 9, 84).fillRect(1181, y + 5, 9, 84);
    g.fillStyle(0x9fd5e1, 0.035).fillTriangle(105, y, 240, y + 135, 105, y + 95);
  }
  obstacles.forEach(o => {
    if (o.kind === 'wall') {
      g.fillStyle(0x101720).fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
      g.fillStyle(0x718073).fillRect(o.x - o.w / 2, o.y - o.h / 2, 6, o.h);
    } else {
      g.fillStyle(0x0d121a, 0.4).fillRoundedRect(o.x - 44, o.y - 16, 96, 51, 5);
      g.fillStyle(0x1d272d).fillRoundedRect(o.x - 18, o.y + 27, 36, 17, 4);
      g.fillStyle(0x93856b).fillRoundedRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 5);
      g.fillStyle(0xb5a182).fillRoundedRect(o.x - o.w / 2 + 3, o.y - o.h / 2 + 3, o.w - 6, o.h - 10, 3);
      g.fillStyle(0xe6e0c4).fillRect(o.x - 28, o.y - 11, 21, 25);
      g.lineStyle(1, 0x83928b).lineBetween(o.x - 24, o.y - 5, o.x - 11, o.y - 5).lineBetween(o.x - 24, o.y, o.x - 11, o.y);
      g.fillStyle(0x769592).fillRoundedRect(o.x + 13, o.y - 11, 18, 25, 2);
    }
  });
  if (menu) {
    for (let i = 0; i < 16; i++) {
      const x = 690 + (i * 97) % 440, y = 230 + (i * 131) % 420;
      const piece = scene.add.rectangle(x, y, 4, 11, [0xc9ff64, 0xad9aff, 0xffa770][i % 3]).setAngle(i * 31).setAlpha(0.65);
      if (animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) scene.tweens.add({ targets: piece, y: y - 35, angle: i * 31 + 70, alpha: 0.2, duration: 2200 + i * 110, yoyo: true, repeat: -1 });
    }
    scene.add.image(910, 432, 'player').setScale(3.4).setAngle(-15);
    scene.add.image(783, 298, 'enemy-1').setScale(1.7).setAngle(15);
    scene.add.image(1080, 570, 'enemy-2').setScale(1.9).setAngle(-24);
    scene.add.image(1040, 230, 'enemy-3').setScale(1.55).setAngle(12);
    scene.add.circle(910, 432, 123).setStrokeStyle(1, 0xc9ff64, 0.15);
    scene.add.circle(910, 432, 157).setStrokeStyle(1, 0xc9ff64, 0.07);
    const shade = scene.add.graphics();
    for (let x = 0; x < 900; x += 5) shade.fillStyle(0x11161f, Math.max(0, 1 - x / 880)).fillRect(x, 0, 5, 800);
    shade.fillStyle(0x11161f, 0.25).fillRect(0, 0, 1280, 800);
  }
  return g;
}

export function confetti(scene, x, y, count = 14) {
  for (let i = 0; i < count; i++) {
    const p = scene.add.rectangle(x, y, Phaser.Math.Between(3, 7), Phaser.Math.Between(5, 12), Phaser.Utils.Array.GetRandom([0xc9ff64, 0xad9aff, 0xffa770, 0x7be3d1])).setDepth(3000);
    scene.tweens.add({ targets: p, x: x + Phaser.Math.Between(-90, 90), y: y + Phaser.Math.Between(-90, 90), angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: 500, onComplete: () => p.destroy() });
  }
}
