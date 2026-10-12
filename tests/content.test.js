import test from 'node:test';
import assert from 'node:assert/strict';
import { MemePhraseSequence, memeContent } from '../src/config/memes.js';
import { selectFinalPhotos } from '../src/lib/finalPhotos.js';
import { levels } from '../src/config/levels.js';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';

test('Each defeat gets a short phrase; long phrases are spaced by 3–5 defeats', () => {
  for (const random of [() => 0, () => 0.5, () => 0.999]) {
    const sequence = new MemePhraseSequence(random);
    let previous = 0;
    for (let kill = 1; kill <= 30; kill++) {
      const phrase = sequence.next();
      assert.ok(memeContent.short.includes(phrase.short));
      if (phrase.large) {
        assert.ok(kill - previous >= 3 && kill - previous <= 5);
        assert.ok(memeContent.large.includes(phrase.large)); previous = kill;
      }
    }
  }
});

test('Final manifest accepts all photo names and excludes the central main image', () => {
  assert.deepEqual(selectFinalPhotos([
    '/public/media/final/photo10.jpeg', '/public/media/final/photo2.png',
    '/public/media/final/photo1.jpg', '/public/media/final/soundtrack.mp3',
    '/public/media/lvl1/photo1.jpg', '/public/media/final/photo_2026-10-12 (2).jpg',
    '/public/media/final/main.jpg',
    '/public/media/final/photo4.jpg.bak',
  ]), ['final/photo_2026-10-12 (2).jpg', 'final/photo1.jpg', 'final/photo2.png', 'final/photo10.jpeg']);
  assert.deepEqual(selectFinalPhotos([]), []);
});

test('Rewards keep exact content and future level media configuration', () => {
  assert.equal(memeContent.rewards[0], 'пр з дн. будь здоров. миронівна. (від ілюхи)');
  assert.deepEqual(levels.map(level => level.rewardTitle), memeContent.rewards);
  for (const level of levels) {
    assert.ok(level.rewardVideos.some(video => video.path === `lvl${level.id}/win${level.id}.mp4`));
    if (level.id > 1) assert.equal(level.rewardPhoto, `lvl${level.id}/win${level.id}.jpg`);
  }
});

test('Every final photo appears once and stays; reduced motion and exit clean resources', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  const oldDocument = globalThis.document, oldWindow = globalThis.window;
  const elements = [], animations = [], listeners = new Set(), timers = [];
  class Node {
    constructor() { this.style = {}; this.children = []; this.clientHeight = 800; this.classList = { toggle() {} }; elements.push(this); }
    append(node) { this.children.push(node); }
    remove() { this.removed = true; }
    animate() { const animation = { cancel() { this.cancelled = true; } }; animations.push(animation); return animation; }
  }
  const layer = new Node(), credit = new Node();
  const motion = { matches: false, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  globalThis.window = { matchMedia: () => motion };
  globalThis.document = { querySelector: key => key === '.final-fall' ? layer : credit, createElement: () => new Node() };
  try {
    const { attachFinalCelebration, finalLimits } = await server.ssrLoadModule('/src/lib/finalCelebration.js');
    const { finalPhotoPaths, mediaUrl } = await server.ssrLoadModule('/src/lib/media.js');
    const photos = finalPhotoPaths();
    const events = new EventEmitter();
    const scene = { events, time: { addEvent: config => {
      const timer = { ...config, remove() { this.removed = true; } }; timers.push(timer); return timer;
    } } };
    attachFinalCelebration(scene);
    assert.equal(credit.textContent, memeContent.final.friends);
    for (let i = 0; i < 60; i++) timers[0].callback();
    const pile = layer.children.filter(node => !node.removed);
    assert.equal(pile.length, photos.length || finalLimits.maxCards);
    if (photos.length) {
      assert.equal(new Set(pile.map(card => card.children[0].src)).size, photos.length);
      assert.deepEqual(pile.map(card => card.children[0].src).sort(), photos.map(mediaUrl).sort());
      assert.ok(layer.children.every(card => !card.removed));
      assert.ok(timers[0].removed);
    }
    motion.matches = true; for (const listener of listeners) listener();
    assert.ok(timers.every(timer => timer.removed));
    assert.ok(animations.every(animation => animation.cancelled));
    assert.equal(layer.children.filter(node => !node.removed).length, photos.length || 8);
    events.emit('shutdown');
    assert.equal(listeners.size, 0);
    assert.ok(layer.children.every(node => node.removed));
  } finally { globalThis.document = oldDocument; globalThis.window = oldWindow; await server.close(); }
});
