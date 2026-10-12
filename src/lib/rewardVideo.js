import { mediaExists, mediaUrl } from './media.js';

export function availableRewardVideos(level) {
  return (level.rewardVideos ?? []).filter(source => mediaExists(source.path));
}

export function attachRewardVideo(scene, level, { minimal = false } = {}) {
  const sources = availableRewardVideos(level);
  if (!sources.length) return null;
  const layout = document.querySelector('.reward-layout'), photo = layout.querySelector('.polaroid');
  const panel = document.createElement('section'); panel.className = 'reward-video';
  panel.innerHTML = `<span class="eyebrow">ТВОЯ ВІДЕОНАГОРОДА</span><video controls playsinline preload="metadata" aria-label="Відеонагорода"></video><div class="video-actions"><button type="button" id="video-play">▶ Play</button><button type="button" id="video-replay">↻ Replay</button><label>Гучність <input type="range" id="video-volume" min="0" max="100" aria-label="Гучність відео"></label></div><p class="video-status" role="status"></p>`;
  if (minimal) panel.classList.add('minimal-video');
  photo.hidden = true; photo.after(panel); layout.classList.add('has-video');
  const video = panel.querySelector('video'), play = panel.querySelector('#video-play');
  const replay = panel.querySelector('#video-replay'), volume = panel.querySelector('#video-volume');
  const status = panel.querySelector('.video-status');
  let disposed = false, sourceIndex = 0;
  const listeners = [];
  const listen = (target, name, fn) => { target.addEventListener(name, fn); listeners.push(() => target.removeEventListener(name, fn)); };
  const syncVolume = () => { video.volume = scene.sound.volume; volume.value = Math.round(video.volume * 100); };
  syncVolume(); scene.sound.on('volume', syncVolume);
  const syncNativeVolume = () => {
    const value = video.muted ? 0 : video.volume;
    volume.value = Math.round(value * 100);
    if (Math.abs(scene.sound.volume - value) > 0.001) scene.sound.volume = value;
    try { localStorage.setItem('sanya-volume', String(Math.round(value * 100))); } catch { /* Optional storage. */ }
  };
  listen(video, 'volumechange', syncNativeVolume);
  listen(volume, 'input', () => { video.muted = false; video.volume = Number(volume.value) / 100; syncNativeVolume(); });
  const updateButton = () => { play.textContent = video.paused ? '▶ Play' : 'Ⅱ Pause'; };
  for (const event of ['play', 'pause', 'ended']) listen(video, event, updateButton);
  const tryPlay = async () => {
    try { await video.play(); if (!disposed) status.textContent = ''; }
    catch { if (!disposed && !minimal) status.textContent = 'Натисни Play, щоб подивитися відео зі звуком.'; }
  };
  listen(play, 'click', () => { if (video.paused) tryPlay(); else video.pause(); });
  listen(replay, 'click', () => { video.currentTime = 0; tryPlay(); });
  const selectSource = () => {
    // Real container MIME, not a renamed file. MP4 takes priority over the original.
    const source = document.createElement('source'); source.src = mediaUrl(sources[sourceIndex].path); source.type = sources[sourceIndex].type;
    video.replaceChildren(source); video.load(); tryPlay();
  };
  const sourceError = () => {
    if (disposed) return;
    if (++sourceIndex < sources.length) { selectSource(); return; }
    video.pause(); panel.hidden = true; photo.hidden = false; layout.classList.remove('has-video');
    if (minimal) photo.classList.add('missing-reward');
  };
  listen(video, 'error', sourceError);
  // Resource errors on <source> do not bubble as a video error in all browsers.
  const captureError = event => { if (event.target !== video) sourceError(); };
  video.addEventListener('error', captureError, true);
  scene.events.once('shutdown', () => {
    disposed = true; listeners.forEach(remove => remove());
    video.removeEventListener('error', captureError, true); scene.sound.off('volume', syncVolume);
    video.pause(); video.removeAttribute('src'); video.replaceChildren(); video.load(); panel.remove();
  });
  selectSource();
  return video;
}
