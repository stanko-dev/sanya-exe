import test from 'node:test';
import assert from 'node:assert/strict';
import { levels, enemyTypes, playerConfig } from '../src/config/levels.js';
import { makeGrid, findPath, CELL } from '../src/lib/navigation.js';

for (const level of levels) {
  test(`Level ${level.id}: all traversable cells connect to the player spawn`, () => {
    const grid = makeGrid(level.obstacles);
    const start = { x: 640, y: 692 };
    for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x]) continue;
      const target = { x: x * CELL + CELL / 2, y: y * CELL + CELL / 2 };
      if (Math.floor(start.x / CELL) === x && Math.floor(start.y / CELL) === y) continue;
      const path = findPath(grid, start, target);
      assert.ok(path.length, `Unreachable cell ${x},${y}`);
      for (const point of path) assert.equal(grid[Math.floor(point.y / CELL)][Math.floor(point.x / CELL)], false);
    }
  });
  test(`Level ${level.id}: correct difficulty, all three global types`, () => {
    const count = level.enemies.reduce((sum, e) => sum + e.count, 0);
    assert.equal(count, [12, 15, 18][level.id - 1]);
    assert.deepEqual(level.enemies.map(e => e.id).sort(), [1, 2, 3]);
    assert.equal(level.difficulty.speedMultiplier, [1.15, 1.3, 1.45][level.id - 1]);
    assert.equal(level.difficulty.damageMultiplier, [1, 1.2, 1.4][level.id - 1]);
    for (const enemy of level.enemies) {
      assert.ok(enemy.hp > 0 && enemy.speed > 0 && enemy.damage > 0);
      assert.equal(enemy.media.face, enemyTypes[enemy.id].face);
      assert.equal(enemy.media.inputSound, enemyTypes[enemy.id].inputSound);
      assert.equal(enemy.speed, enemy.baseSpeed * level.difficulty.speedMultiplier);
      assert.equal(enemy.damage, enemy.baseDamage * level.difficulty.damageMultiplier);
    }
  });
}
test('Player balance stays at the requested values', () => {
  assert.equal(playerConfig.hp, 100); assert.equal(playerConfig.speed, 270);
  assert.equal(playerConfig.damage, 30); assert.equal(playerConfig.fireDelay, 190);
});
test('Traps are optional, uniquely named and away from solids, spawn, exit and center passages', () => {
  const ids = new Set();
  for (const level of levels) {
    assert.equal(level.traps.length, level.id + 1);
    for (const t of level.traps) {
      assert.ok(!ids.has(t.id)); ids.add(t.id);
      assert.equal(t.damage, 35); assert.equal(t.warningMs, 600); assert.ok(t.cooldownMs >= 600);
      assert.ok(['damage', 'instant_death'].includes(t.type));
      assert.equal(t.photo, `traps/${t.id}/photo.jpg`); assert.equal(t.sound, `traps/${t.id}/sound.ogg`);
      assert.ok(t.width > 0 && t.height > 0 && t.message);
      assert.ok(Math.abs(t.x - 640) > 100, 'Keep center chokepoints clear');
      for (const o of [...level.obstacles, { x: 640, y: 692, w: 60, h: 60 }, { x: 640, y: 122, w: 130, h: 70 }]) {
        assert.ok(Math.abs(t.x - o.x) >= (t.width + o.w) / 2 + 20 || Math.abs(t.y - o.y) >= (t.height + o.h) / 2 + 20, `${t.id} too close to solid / spawn / door`);
      }
      assert.ok(t.x - t.width / 2 > 110 && t.x + t.width / 2 < 1170);
      assert.ok(t.y - t.height / 2 > 135 && t.y + t.height / 2 < 710);
    }
  }
});
test('Difficulty increases in total enemy HP and numbers', () => {
  const health = levels.map(l => l.enemies.reduce((s, e) => s + e.hp * e.count, 0));
  assert.ok(health[0] < health[1] && health[1] < health[2]);
});
test('Unreachable path returns empty instead of crossing a wall', () => {
  const grid = makeGrid([{ x: 640, y: 400, w: 64, h: 800 }]);
  assert.deepEqual(findPath(grid, { x: 200, y: 200 }, { x: 1000, y: 200 }), []);
});
