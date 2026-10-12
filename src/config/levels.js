import { memeContent } from './memes.js';
// All balance, room geometry, wishes and optional media live here.
export const enemyTypes = {
  1: { face: 'lvl1/face_lvl1.jpg', inputSound: 'lvl1/mob_sound1.mp4' },
  2: { face: 'lvl2/face_lvl2.jpg', inputSound: 'lvl2/morda.ogg' },
  3: { face: 'lvl3/face_lvl3.jpg', inputSound: 'lvl3/nothanks.ogg' },
};
const enemy = (level, type, options) => ({
  id: type,
  name: ['Відмінник', 'Фізрук', 'Староста'][type - 1],
  hp: 45, speed: 70, damage: 8, count: 4, attackCooldown: 1000,
  color: [0xad9aff, 0xffa770, 0x7be3d1][type - 1],
  media: {
    ...enemyTypes[type],
    outputSound: `lvl${level}/output_sound_lvl${level}_${type}.mp3`,
  },
  ...options,
});

export const playerConfig = { hp: 100, speed: 270, damage: 30, fireDelay: 190, bulletSpeed: 800, invulnerability: 650 };
// Visual sizes never determine the Arcade hitbox or the BFS padding.
export const enemyVisualConfig = { bodySize: 80, headWidth: 74, headHeight: 78, headOffset: 36, hitboxSize: 30 };
export const menuMedia = { background: 'menu/background.png', soundtrack: 'menu/soundtrack.mp3' };

const desks = (rows) => rows.flatMap(y => [260, 440, 840, 1020].map(x => ({ x, y, w: 92, h: 48, kind: 'desk' })));
const layout = (rows) => [
  { x: 640, y: 227, w: 24, h: 156, kind: 'wall' },
  { x: 640, y: 533, w: 24, h: 138, kind: 'wall' },
  ...desks(rows),
];

const trap = (id, x, y) => ({
  id, x, y, width: 48, height: 48,
  type: 'damage', damage: 35, warningMs: 600, cooldownMs: 2500,
  photo: `traps/${id}/photo.jpg`, sound: `traps/${id}/sound.ogg`,
  message: memeContent.ui.defeat,
});
const balance = (types, speedMultiplier, damageMultiplier) => types.map(type => ({
  ...type, baseSpeed: type.speed, baseDamage: type.damage,
  speed: type.speed * speedMultiplier, damage: type.damage * damageMultiplier,
}));

export const levels = [
  {
    id: 1, title: 'Перший дзвоник', room: 'КАБІНЕТ 101', subtitle: 'Контрольна з виживання. Підказки дозволено.',
    accent: 0xc9ff64, obstacles: layout([280, 470]),
    difficulty: { speedMultiplier: 1.15, damageMultiplier: 1.0 },
    enemies: [enemy(1, 1, { count: 5 }), enemy(1, 2, { count: 4, hp: 65, speed: 60, damage: 12 }), enemy(1, 3, { count: 3, hp: 45, speed: 90, damage: 8 })],
    traps: [trap('trap1', 160, 360), trap('trap2', 1120, 550)],
    rewardTitle: memeContent.rewards[0], wish: "",
    rewardPhoto: 'lvl1/reward_photo.png', soundtrack: 'lvl1/soundtrack.mp3',
    rewardVideos: [
      { path: 'lvl1/win1.mp4', type: 'video/mp4' },
      // Inspected original: mp42 container, H.264 + AAC. No renamed copy.
      { path: 'lvl1/win1.mov', type: 'video/mp4' },
    ],
  },
  {
    id: 2, title: 'Велика перерва', room: 'КАБІНЕТ 202', subtitle: 'Дзвінок для вчителя. Конфеті — для всіх.',
    accent: 0xad9aff, obstacles: layout([260, 450, 610]),
    difficulty: { speedMultiplier: 1.3, damageMultiplier: 1.2 },
    enemies: [enemy(2, 1, { count: 6, hp: 55, speed: 82 }), enemy(2, 2, { count: 5, hp: 80, speed: 68, damage: 13 }), enemy(2, 3, { count: 4, hp: 45, speed: 105, damage: 9 })],
    traps: [trap('trap3', 160, 350), trap('trap4', 1120, 350), trap('trap5', 750, 550)],
    rewardTitle: memeContent.rewards[1], wish: "",
    rewardPhoto: 'lvl2/win2.jpg', soundtrack: 'lvl2/soundtrack.mp3',
    rewardVideos: [{ path: 'lvl2/win2.mp4', type: 'video/mp4' }],
  },
  {
    id: 3, title: 'Останній дзвоник', room: 'АКТОВА ЗАЛА', subtitle: 'Фінальний раунд. Покажи, хто тут іменинник.',
    accent: 0xffa770, obstacles: layout([270, 460, 620]),
    difficulty: { speedMultiplier: 1.45, damageMultiplier: 1.4 },
    enemies: [enemy(3, 1, { count: 7, hp: 65, speed: 90, damage: 10 }), enemy(3, 2, { count: 6, hp: 95, speed: 75, damage: 16 }), enemy(3, 3, { count: 5, hp: 55, speed: 112, damage: 12 })],
    traps: [trap('trap6', 160, 350), trap('trap7', 1120, 350), trap('trap8', 750, 550), trap('trap9', 530, 550)],
    rewardTitle: memeContent.rewards[2], wish: "",
    rewardPhoto: 'lvl3/win3.jpg', soundtrack: 'lvl3/soundtrack.mp3',
    rewardVideos: [
      { path: 'lvl3/win3.mp4', type: 'video/mp4' },
      // Original .MOV inspected: mp42 container, H.264 + AAC; no format renaming.
      { path: 'lvl3/win3.mov', type: 'video/mp4' },
    ],
  },
].map(level => ({ ...level, enemies: balance(level.enemies, level.difficulty.speedMultiplier, level.difficulty.damageMultiplier) }));
