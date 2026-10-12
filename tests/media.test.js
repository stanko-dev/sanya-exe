import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { enemyTypes } from '../src/config/levels.js';

test('Real optional media discovery, Phaser Opus routing and menu player bindings', async t => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  try {
    const media = await server.ssrLoadModule('/src/lib/media.js');
    await t.test('Three JPGs discovered; missing future assets are skipped; Opus keeps its real .ogg URL', () => {
      const images = [], audio = [];
      const scene = { load: { image: (...args) => images.push(args), audio: (...args) => audio.push(args) } };
      for (const type of Object.values(enemyTypes)) { media.queueImage(scene, type.face); media.queueAudio(scene, type.inputSound); }
      assert.equal(images.length, 3); assert.equal(audio.length, 3);
      assert.ok(images.every(([key, url]) => key.endsWith('.jpg') && url === `/sanya-exe/media/${key}`));
      assert.ok(audio.filter(([key]) => key.endsWith('.ogg')).every(([key, urls]) => urls[0].type === 'opus' && urls[0].url === `/sanya-exe/media/${key}`));
      assert.deepEqual(audio.find(([key]) => key.endsWith('.mp4'))[1], { url: '/sanya-exe/media/lvl1/mob_sound1.mp4', type: 'm4a' });
      assert.equal(media.mediaExists('lvl1/hit_sound.ogg'), false);
      assert.equal(media.mediaExists('traps/trap1/photo.jpg'), false);
      media.queueImage(scene, undefined); media.queueAudio(scene, undefined);
    });
    await t.test('Optional hit sounds and actual playback wrapper share type gate and cleanup', () => {
      const events = new EventEmitter(), sounds = [];
      const scene = { events, cache: { audio: { exists: path => media.mediaExists(path) } }, sound: { locked: false, add: () => {
        const sound = new EventEmitter(); sound.isPlaying = false;
        sound.play = () => { sound.isPlaying = true; return true; };
        sound.destroy = () => { sound.isPlaying = false; sound.destroyed = true; };
        sounds.push(sound); return sound;
      } } };
      const type = id => ({ id, media: enemyTypes[id] });
      assert.equal(media.playHitSound(scene, { id: 99, media: { inputSound: 'lvl1/future-missing.ogg' } }), false);
      assert.equal(sounds.length, 0);
      assert.equal(media.playHitSound(scene, type(2)), true);
      assert.equal(media.playHitSound(scene, type(2)), false);
      assert.equal(media.playHitSound(scene, type(3)), true);
      assert.equal(media.playHitSound(scene, type(1)), true);
      assert.equal(media.playHitSound(scene, type(1)), false);
      assert.equal(sounds.length, 3);
      sounds[0].emit('complete'); assert.ok(sounds[0].destroyed);
      assert.equal(media.playHitSound(scene, type(2)), false, 'Completion alone does not bypass cooldown');
      events.emit('shutdown'); assert.ok(sounds.every(sound => sound.destroyed));
    });
    const { attachMenuPlayer, formatTime, trackTitle } = await server.ssrLoadModule('/src/lib/menuPlayer.js');
    await t.test('Menu starts paused, Play/Pause, seeking, volume sync, metadata, title and shutdown', async () => {
      class Element extends EventTarget {
        constructor() { super(); this.attributes = {}; this.value = 0; }
        setAttribute(key, value) { this.attributes[key] = value; }
        append(child) { this.child = child; }
        remove() { this.removed = true; }
        querySelector(selector) { return this.nodes[selector]; }
      }
      class FakeAudio extends Element {
        constructor() { super(); this.paused = true; this.duration = NaN; this.currentTime = 0; this.playCount = 0; }
        async play() { this.playCount++; this.paused = false; this.dispatchEvent(new Event('play')); }
        pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
        removeAttribute(name) { delete this[name]; }
        load() { this.unloaded = true; }
      }
      const oldDocument = globalThis.document, oldAudio = globalThis.Audio;
      const panel = new Element(); panel.nodes = Object.fromEntries(['.track-title', '#music-play', '#music-seek', '#music-time', '#music-status'].map(key => [key, new Element()]));
      globalThis.Audio = FakeAudio;
      globalThis.document = { createElement: () => panel, querySelector: () => ({ after: () => {} }) };
      try {
        const sound = new EventEmitter(); sound.volume = 0.65;
        const scene = { sound, events: new EventEmitter() };
        const audio = attachMenuPlayer(scene, 'menu/soundtrack.mp3', { autoplay: false });
        assert.ok(audio.paused); assert.equal(audio.playCount, 0); assert.equal(audio.volume, 0.65);
        assert.equal(panel.nodes['.track-title'].textContent, trackTitle);
        audio.duration = 124.58; audio.dispatchEvent(new Event('loadedmetadata'));
        assert.equal(panel.nodes['#music-time'].textContent, '0:00 / 2:04');
        assert.equal(panel.nodes['#music-seek'].disabled, false);
        panel.nodes['#music-play'].dispatchEvent(new Event('click')); await Promise.resolve();
        assert.equal(audio.paused, false); assert.equal(panel.nodes['#music-play'].textContent, 'Ⅱ Pause');
        panel.nodes['#music-play'].dispatchEvent(new Event('click')); assert.ok(audio.paused);
        panel.nodes['#music-seek'].value = 61.2; panel.nodes['#music-seek'].dispatchEvent(new Event('input'));
        assert.equal(audio.currentTime, 61.2); assert.equal(panel.nodes['#music-time'].textContent, '1:01 / 2:04');
        sound.volume = 0.25; sound.emit('volume'); assert.equal(audio.volume, 0.25);
        audio.dispatchEvent(new Event('error')); assert.ok(panel.nodes['#music-play'].disabled);
        scene.events.emit('shutdown');
        assert.ok(audio.paused && audio.unloaded && panel.removed); assert.equal(audio.src, undefined);
        assert.equal(sound.listenerCount('volume'), 0);
        const count = audio.playCount;
        panel.nodes['#music-play'].dispatchEvent(new Event('click')); assert.equal(audio.playCount, count);
        assert.equal(formatTime(NaN), '0:00');
      } finally { globalThis.document = oldDocument; globalThis.Audio = oldAudio; }
    });
  } finally { await server.close(); }
});

test('Original JPG / Ogg Opus / MP3 signatures and complete Ogg streams', async () => {
  for (const type of Object.values(enemyTypes)) {
    const jpg = await readFile(`public/media/${type.face}`);
    assert.equal(jpg.subarray(0, 3).toString('hex'), 'ffd8ff');
    assert.equal(jpg.subarray(-2).toString('hex'), 'ffd9');
  }
  for (const path of [enemyTypes[2].inputSound, enemyTypes[3].inputSound]) {
    const data = await readFile(`public/media/${path}`);
    let offset = 0, end = false;
    assert.ok(data.includes(Buffer.from('OpusHead')));
    while (offset < data.length) {
      assert.equal(data.toString('ascii', offset, offset + 4), 'OggS');
      const n = data[offset + 26], segments = data.subarray(offset + 27, offset + 27 + n);
      const size = 27 + n + segments.reduce((a, b) => a + b, 0);
      assert.ok(offset + size <= data.length);
      const page = Buffer.from(data.subarray(offset, offset + size)), expected = page.readUInt32LE(22);
      page.fill(0, 22, 26); let crc = 0;
      for (const byte of page) {
        crc ^= byte << 24;
        for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x80000000 ? 0x04c11db7 : 0)) >>> 0;
      }
      assert.equal(crc, expected); end = Boolean(data[offset + 5] & 4); offset += size;
    }
    assert.ok(end);
  }
  const mp3 = await readFile('public/media/menu/soundtrack.mp3');
  assert.equal(mp3[0], 0xff); assert.equal(mp3[1] & 0xe0, 0xe0);
});
