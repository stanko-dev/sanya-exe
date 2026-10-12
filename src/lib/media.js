// Vite discovers only real files. Missing optional assets never generate requests.
import { SoundGate } from './soundGate.js';
import { selectFinalPhotos } from './finalPhotos.js';
const files = import.meta.glob('/public/media/**/*.{png,jpg,jpeg,mp3,ogg,mp4,mov}', { eager: true, query: '?url', import: 'default' });
export function mediaExists(path) { return Boolean(path && files[`/public/media/${path}`]); }
export function mediaUrl(path) { return `${import.meta.env.BASE_URL}media/${path}`; }
export function queueImage(scene, path) { if (mediaExists(path)) scene.load.image(path, mediaUrl(path)); }
export function queueAudio(scene, path) {
  if (!mediaExists(path)) return;
  // Phaser otherwise infers "ogg" and tests Vorbis support, not Opus support.
  // Explicit type selects its Opus capability flag without renaming the file.
  const url = mediaUrl(path);
  const source = path.endsWith('.ogg') ? [{ url, type: 'opus' }, { url, type: 'ogg' }]
    : path.endsWith('.mp4') ? { url, type: 'm4a' } : url;
  scene.load.audio(path, source);
}
const hitGate = new SoundGate(1700);
export function playHitSound(scene, type) {
  const path = type.media.inputSound, now = performance.now();
  if (!path || !scene.cache.audio.exists(path) || !hitGate.canPlay(type.id, now)) return false;
  const sound = scene.sound.add(path, { volume: 0.6 });
  // Never queue a hit effect to play after the scene has changed / audio unlocks.
  if (scene.sound.locked || !sound.play()) { sound.destroy(); return false; }
  hitGate.record(type.id, now, sound);
  const cleanup = () => {
    scene.events.off('shutdown', cleanup);
    hitGate.release(sound); sound.destroy();
  };
  sound.once('complete', cleanup);
  scene.events.once('shutdown', cleanup);
  return true;
}
export function playSound(scene, path) {
  if (scene.cache.audio.exists(path)) scene.sound.play(path, { volume: 0.6 });
}
export function music(scene, path) {
  scene.sound.stopAll();
  if (!scene.cache.audio.exists(path)) return;
  const track = scene.sound.add(path, { loop: true, volume: 0.55 });
  track.play();
  scene.events.once('shutdown', () => { track.stop(); track.destroy(); });
}

// Build-time Vite manifest: no HTTP directory listing.
export function finalPhotoPaths() {
  return selectFinalPhotos(Object.keys(files));
}
