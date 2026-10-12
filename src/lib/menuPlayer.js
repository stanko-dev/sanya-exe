import { mediaExists, mediaUrl } from './media.js';

export const trackTitle = 'lil jesus ft. jalisius — кукла (prod. vacemadest)';
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function attachMenuPlayer(scene, path) {
  const panel = document.createElement('div');
  panel.className = 'menu-player';
  panel.innerHTML = `<div class="track-title"></div><div class="player-controls"><button id="music-play" type="button" aria-label="Відтворити музику">▶ Play</button><input id="music-seek" type="range" min="0" max="0" step="0.1" value="0" disabled aria-label="Перемотування музики"><output id="music-time">0:00 / 0:00</output></div><span id="music-status" role="status"></span>`;
  panel.querySelector('.track-title').textContent = trackTitle;
  document.querySelector('.volume').after(panel);
  const audio = new Audio();
  audio.hidden = true; panel.append(audio);
  audio.preload = 'metadata'; audio.loop = false;
  const button = panel.querySelector('#music-play'), seek = panel.querySelector('#music-seek');
  const output = panel.querySelector('#music-time'), status = panel.querySelector('#music-status');
  const listeners = [];
  let disposed = false;
  const listen = (target, name, fn) => { target.addEventListener(name, fn); listeners.push(() => target.removeEventListener(name, fn)); };
  const syncVolume = () => { audio.volume = scene.sound.volume; };
  syncVolume(); scene.sound.on('volume', syncVolume);
  const refresh = () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    seek.max = duration; seek.disabled = duration <= 0; seek.value = audio.currentTime;
    output.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
    button.textContent = audio.paused ? '▶ Play' : 'Ⅱ Pause';
    button.setAttribute('aria-label', audio.paused ? 'Відтворити музику' : 'Призупинити музику');
  };
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended']) listen(audio, event, refresh);
  listen(audio, 'error', () => { status.textContent = 'Музика недоступна'; button.disabled = true; seek.disabled = true; });
  listen(button, 'click', async () => {
    if (!audio.paused) { audio.pause(); return; }
    try { await audio.play(); if (!disposed) status.textContent = ''; }
    catch { if (!disposed) status.textContent = 'Не вдалося відтворити. Спробуй ще раз.'; }
  });
  listen(seek, 'input', () => {
    if (Number.isFinite(audio.duration)) { audio.currentTime = Math.min(audio.duration, Math.max(0, Number(seek.value))); refresh(); }
  });
  if (mediaExists(path)) audio.src = mediaUrl(path);
  else { status.textContent = 'Музика ще не додана'; button.disabled = true; }
  scene.events.once('shutdown', () => {
    disposed = true; listeners.forEach(remove => remove());
    scene.sound.off('volume', syncVolume);
    audio.pause(); audio.removeAttribute('src'); audio.load(); panel.remove();
  });
  return audio;
}
