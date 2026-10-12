import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundGate } from '../src/lib/soundGate.js';
import { TrapState, trapContains, damageResult } from '../src/lib/traps.js';

const trapConfig = { x: 100, y: 100, width: 48, height: 48, warningMs: 600, cooldownMs: 2500 };
test('Hit audio: shared type cooldown, independent types, no overlap even after 1700 ms', () => {
  const gate = new SoundGate(); const sound = { isPlaying: true };
  assert.ok(gate.canPlay(2, 0)); gate.record(2, 0, sound);
  assert.equal(gate.canPlay(2, 100), false);
  assert.ok(gate.canPlay(3, 100));
  assert.equal(gate.canPlay(2, 1700), false, 'Still playing');
  sound.isPlaying = false;
  assert.equal(gate.canPlay(2, 1699), false);
  assert.ok(gate.canPlay(2, 1700));
  sound.isPaused = true; assert.equal(gate.canPlay(2, 1800), false);
  gate.release(sound); assert.ok(gate.canPlay(2, 1800));
});
test('Sound cleanup keeps the cooldown when switching / restarting scenes', () => {
  const gate = new SoundGate(), sound = { isPlaying: true };
  gate.record(1, 100, sound); gate.release(sound);
  assert.equal(gate.canPlay(1, 1799), false); assert.ok(gate.canPlay(1, 1800));
});
test('Trap warns for 600 ms, triggers once, then cools down', () => {
  const state = new TrapState(trapConfig);
  assert.equal(state.update(0, false), null);
  assert.equal(state.update(100, true), 'warning');
  assert.equal(state.update(699, true), null);
  assert.equal(state.update(700, true), 'trigger');
  assert.equal(state.update(701, true), null);
  assert.equal(state.update(3199, true), null);
  assert.equal(state.update(3200, true), 'warning');
});
test('Leaving before trap resolves avoids damage but still consumes activation', () => {
  const state = new TrapState(trapConfig);
  state.update(0, true);
  assert.equal(state.update(600, false), 'cancel');
  assert.equal(state.phase, 'cooldown');
  assert.equal(state.update(800, true), null);
});
test('Returning during warning is dangerous; cooldown and warning use supplied active time', () => {
  const state = new TrapState(trapConfig); state.update(0, true);
  assert.equal(state.update(300, false), null);
  assert.equal(state.update(300, false), null, 'Paused simulation does not advance');
  assert.equal(state.update(600, true), 'trigger');
});
test('Enemy and trap damage share invulnerability, including instant death', () => {
  const first = damageResult(100, 35, 1000, 0, 650);
  assert.deepEqual(first, { hp: 65, invulnerableUntil: 1650 });
  assert.equal(damageResult(65, 35, 1100, first.invulnerableUntil, 650), null);
  assert.equal(damageResult(65, 35, 1100, first.invulnerableUntil, 650, true), null);
  assert.equal(damageResult(65, 35, 1650, first.invulnerableUntil, 650).hp, 30);
  assert.equal(damageResult(100, 35, 1650, first.invulnerableUntil, 650, true).hp, 0);
  assert.equal(damageResult(20, 35, 2000, 0, 650).hp, 0);
});
test('Trap intersection uses player body bounds; touching edge alone does not trigger', () => {
  assert.ok(trapContains(trapConfig, { left: 90, right: 110, top: 90, bottom: 110 }));
  assert.equal(trapContains(trapConfig, { left: 124, right: 140, top: 90, bottom: 110 }), false);
});
