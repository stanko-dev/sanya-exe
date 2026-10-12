import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'vite';
import { PlaybackIntent } from '../src/lib/playbackIntent.js';
import { levels } from '../src/config/levels.js';

class Element extends EventTarget {
  constructor() { super(); this.nodes = {}; this.children = []; this.value = 0; this.classList = { add() {}, remove() {} }; }
  querySelector(key) { return this.nodes[key] ??= new Element(); }
  append(node) { this.children.push(node); }
  after(node) { this.next = node; }
  replaceChildren(...nodes) { this.children = nodes; }
  remove() { this.removed = true; }
  setAttribute() {}
  removeAttribute(name) { delete this[name]; }
  focus() { this.focused = true; }
}
class FakeMedia extends Element {
  constructor() { super(); this.paused = true; this.volume = 1; this.currentTime = 0; this.duration = 20; this.playCount = 0; }
  async play() {
    this.playCount++;
    if (this.blockOnce) { this.blockOnce = false; throw Object.assign(new Error('autoplay blocked'), { name: 'NotAllowedError' }); }
    this.paused = false; this.dispatchEvent(new Event('play'));
  }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  load() { this.loaded = true; }
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const click = node => node.dispatchEvent(new Event('click'));
function scene() { const sound = new EventEmitter(); sound.volume = 0.65; return { sound, events: new EventEmitter() }; }

test('Manual Pause is persisted until explicit Play', () => {
  const saved = new Map(), storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  const first = new PlaybackIntent(storage); assert.ok(first.canAutoplay()); first.pause();
  const reloaded = new PlaybackIntent(storage); assert.equal(reloaded.canAutoplay(), false);
  reloaded.play(); assert.ok(new PlaybackIntent(storage).canAutoplay());
});

test('Autoplay policy, single menu stream, video fallback and cleanup', async t => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' });
  const oldDocument = globalThis.document, oldAudio = globalThis.Audio;
  const root = new Element(), volume = new Element(), layout = new Element();
  const panels = []; let nextBlocked = false;
  globalThis.Audio = class extends FakeMedia { constructor() { super(); this.blockOnce = nextBlocked; nextBlocked = false; } };
  globalThis.document = {
    createElement(tag) { const element = tag === 'video' ? new FakeMedia() : new Element(); panels.push(element); return element; },
    querySelector(selector) { return selector === '#ui' ? root : selector === '.volume' ? volume : layout; },
  };
  try {
    const { attachMenuPlayer } = await server.ssrLoadModule('/src/lib/menuPlayer.js');
    await t.test('Allowed autoplay uses one audio, manual Pause suppresses scene re-entry', async () => {
      const intent = new PlaybackIntent(), first = scene();
      const audio = attachMenuPlayer(first, 'menu/soundtrack.mp3', { intent }); await flush();
      assert.equal(audio.playCount, 1); assert.equal(audio.paused, false);
      click(volume.next.querySelector('#music-play')); assert.ok(audio.paused);
      assert.equal(intent.canAutoplay(), false); first.events.emit('shutdown');
      const second = scene(), next = attachMenuPlayer(second, 'menu/soundtrack.mp3', { intent });
      assert.equal(next.playCount, 0); click(volume.next.querySelector('#music-play')); await flush();
      assert.equal(next.playCount, 1); assert.ok(intent.canAutoplay());
      second.events.emit('shutdown'); assert.ok(next.paused && audio.paused);
    });
    await t.test('Blocked autoplay shows ENTER overlay, click starts the same audio', async () => {
      nextBlocked = true; const s = scene();
      const audio = attachMenuPlayer(s, 'menu/soundtrack.mp3', { intent: new PlaybackIntent() }); await flush();
      const overlay = root.children.at(-1);
      assert.equal(overlay.className, 'entry-overlay'); assert.ok(audio.paused);
      click(overlay.querySelector('#enter-sanya')); await flush();
      assert.equal(audio.paused, false); assert.equal(audio.playCount, 2); assert.ok(overlay.removed);
      s.events.emit('shutdown');
    });
    await t.test('Leaving during rejected autoplay cannot append a stale overlay', async () => {
      nextBlocked = true; const s = scene(), before = root.children.length;
      attachMenuPlayer(s, 'menu/soundtrack.mp3', { intent: new PlaybackIntent() });
      s.events.emit('shutdown'); await flush(); assert.equal(root.children.length, before);
    });
    const { attachRewardVideo, availableRewardVideos } = await server.ssrLoadModule('/src/lib/rewardVideo.js');
    await t.test('MP4 paths for all levels; original MOV fallback is discovered without renaming', () => {
      assert.equal(availableRewardVideos(levels[0])[0].path, 'lvl1/win1.mov');
      assert.deepEqual(availableRewardVideos(levels[1]), [{ path: 'lvl2/win2.mp4', type: 'video/mp4' }]);
      assert.deepEqual(availableRewardVideos(levels[2]), []);
      assert.equal(attachRewardVideo(scene(), levels[2]), null);
    });
    await t.test('Video autoplay, Play/Pause, Replay, volume and shutdown cleanup', async () => {
      // The fake panel uses a native-media stand-in for its <video> node.
      const oldCreate = document.createElement;
      document.createElement = tag => {
        const node = oldCreate(tag); if (tag === 'section') node.nodes.video = new FakeMedia(); return node;
      };
      try {
        for (const index of [0, 1]) {
        const s = scene(), video = attachRewardVideo(s, levels[index], { minimal: true }); await flush();
        const panel = layout.querySelector('.polaroid').next;
        assert.equal(video.playCount, 1); assert.equal(video.volume, 0.65);
        assert.equal(video.children[0].src, index === 0 ? '/sanya-exe/media/lvl1/win1.mov' : '/sanya-exe/media/lvl2/win2.mp4');
        assert.equal(video.children[0].type, 'video/mp4');
        click(panel.querySelector('#video-play')); assert.ok(video.paused);
        video.currentTime = 10; click(panel.querySelector('#video-replay')); await flush();
        assert.equal(video.currentTime, 0); assert.equal(video.paused, false);
        panel.querySelector('#video-volume').value = 25;
        panel.querySelector('#video-volume').dispatchEvent(new Event('input')); assert.equal(video.volume, 0.25);
        assert.equal(s.sound.volume, 0.25);
        s.events.emit('shutdown'); assert.ok(video.paused && video.loaded && panel.removed);
        assert.equal(video.children.length, 0); assert.equal(s.sound.listenerCount('volume'), 0);
        }
      } finally { document.createElement = oldCreate; }
    });
  } finally { globalThis.document = oldDocument; globalThis.Audio = oldAudio; await server.close(); }
});
