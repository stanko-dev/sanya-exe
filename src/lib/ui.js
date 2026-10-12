const root = () => document.querySelector('#ui');
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function mount(scene, html) {
  root().innerHTML = html;
  scene.events.once('shutdown', () => { root().innerHTML = ''; });
}
export function on(id, callback) { document.getElementById(id)?.addEventListener('click', callback); }
export function volumeControl(scene) {
  const input = document.getElementById('volume');
  if (!input) return;
  input.value = Math.round(scene.sound.volume * 100);
  const label = document.getElementById('volume-value');
  label.textContent = `${input.value}%`;
  input.addEventListener('input', () => {
    scene.sound.volume = Number(input.value) / 100;
    label.textContent = `${input.value}%`;
    try { localStorage.setItem('sanya-volume', input.value); } catch { /* Storage may be unavailable. */ }
  });
}
export const volumeHtml = `<div class="volume"><span>♫</span><label for="volume">ГУЧНІСТЬ</label><input id="volume" type="range" min="0" max="100" aria-label="Гучність"><output id="volume-value"></output></div>`;
export const controlsHtml = `<div class="control-row"><span class="keys"><kbd>W</kbd><br><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span>Рухайся<br><small>Не стій на місці</small></span></div><div class="control-row"><span class="keys mouse-key">↖</span><span>Миша + ЛКМ<br><small>Прицілюйся й утримуй для пострілів</small></span></div><div class="control-row"><span class="keys"><kbd>ESC</kbd></span><span>Пауза<br><small>Перепочинок теж частина плану</small></span></div>`;
