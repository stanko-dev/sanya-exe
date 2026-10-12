// Optional local integration check. Uses installed Chrome and Node built-ins only.
// Run: node tests/browser-smoke.mjs
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const chromePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
await mkdir('test-results', { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5178', '--strictPort'], { windowsHide: true, stdio: 'ignore' });
let chrome, socket;
const errors = [], responses = [], pending = new Map(); let serial = 0;
async function poll(fn, description, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { try { const result = await fn(); if (result) return result; } catch { /* Wait for startup. */ } await sleep(100); }
  throw new Error(`Timed out: ${description}`);
}
function send(method, params = {}) {
  const id = ++serial;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression, userGesture = false) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
  return result.result.value;
}
try {
  await poll(async () => (await fetch('http://127.0.0.1:5178/sanya-exe/')).ok, 'Vite');
  chrome = spawn(chromePath, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu', '--disable-software-rasterizer', '--remote-debugging-port=9228', `--user-data-dir=${resolve('test-results/chrome-profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let chromeLog = '';
  chrome.stderr.on('data', chunk => { chromeLog = (chromeLog + chunk).slice(-2000); if (process.env.SMOKE_DEBUG) process.stderr.write(chunk); });
  chrome.once('exit', code => {
    for (const item of pending.values()) item.reject(new Error(`Chrome exited (${code}): ${chromeLog}`));
    pending.clear();
  });
  chrome.on('error', error => errors.push(error.message));
  const targets = await poll(async () => (await (await fetch('http://127.0.0.1:9228/json')).json()).find(t => t.type === 'page'), 'Chrome');
  socket = new WebSocket(targets.webSocketDebuggerUrl);
  await new Promise((r, j) => { socket.addEventListener('open', r, { once: true }); socket.addEventListener('error', j, { once: true }); });
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (process.env.SMOKE_DEBUG) console.log('CDP:', data.id || data.method);
    if (data.id && pending.has(data.id)) {
      const item = pending.get(data.id); pending.delete(data.id);
      if (data.error) item.reject(new Error(data.error.message)); else item.resolve(data.result);
    }
    if (data.method === 'Runtime.exceptionThrown') errors.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
    if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') errors.push(data.params.entry.text);
    if (data.method === 'Network.responseReceived' && data.params.response.status >= 400) responses.push(data.params.response.url);
  });
  await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://127.0.0.1:5178/sanya-exe/' });
  await poll(() => evaluate(`Boolean(window.sanyaGame?.scene.isActive('Menu') && document.querySelector('.menu-player audio')?.duration > 0)`), 'menu and audio metadata');
  assert.deepEqual(await evaluate(`['lvl1/face_lvl1.jpg','lvl2/face_lvl2.jpg','lvl3/face_lvl3.jpg'].map(k=>sanyaGame.textures.exists(k))`), [true, true, true]);
  assert.deepEqual(await evaluate(`['lvl2/morda.ogg','lvl3/nothanks.ogg'].map(k=>sanyaGame.cache.audio.get(k)?.duration > 0)`), [true, true]);
  assert.equal(await evaluate(`sanyaGame.cache.audio.exists('lvl1/hit_sound.ogg')`), false);
  assert.equal(await evaluate(`document.querySelector('audio').paused`), true);
  await evaluate(`document.querySelector('#music-play').click()`, true);
  await poll(() => evaluate(`!document.querySelector('audio').paused`), 'menu Play');
  await evaluate(`document.querySelector('#volume').value=25;document.querySelector('#volume').dispatchEvent(new Event('input'))`);
  assert.equal(await evaluate(`document.querySelector('audio').volume`), 0.25);
  assert.equal(await evaluate(`localStorage.getItem('sanya-volume')`), '25');
  await evaluate(`document.querySelector('#music-play').click();document.querySelector('#music-seek').value=30;document.querySelector('#music-seek').dispatchEvent(new Event('input'))`);
  assert.equal(await evaluate(`document.querySelector('audio').paused && Math.abs(document.querySelector('audio').currentTime-30)<.5`), true);
  assert.equal(await evaluate(`sanyaGame.sound.sounds.filter(s=>s.isPlaying).length`), 0);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('test-results/menu.png', Buffer.from(shot.data, 'base64'));
  await evaluate(`window.oldMenuAudio=document.querySelector('audio');document.querySelector('#start').click()`, true);
  await poll(() => evaluate(`sanyaGame.scene.isActive('Game')`), 'Game');
  assert.equal(await evaluate(`oldMenuAudio.paused && !oldMenuAudio.hasAttribute('src') && !document.querySelector('.menu-player')`), true);
  for (let index = 0; index < 3; index++) {
    if (index) { await evaluate(`sanyaGame.scene.getScene('Game').scene.restart({levelIndex:${index}})`); await sleep(250); }
    const result = await evaluate(`(()=>{const s=sanyaGame.scene.getScene('Game');s.enemies.getChildren().forEach(e=>e.setVelocity(0));s.physics.pause();return {count:s.enemies.getLength(),heads:s.enemies.getChildren().every(e=>e.head && e.head.scaleX===e.head.scaleY),bodies:s.enemies.getChildren().every(e=>Math.abs(e.body.width-30)<.01&&Math.abs(e.body.height-30)<.01),traps:s.traps.length,types:[...new Set(s.enemies.getChildren().map(e=>e.stats.id))].sort()}})()`);
    assert.equal(result.count, [12, 15, 18][index]); assert.ok(result.heads && result.bodies); assert.equal(result.traps, index + 2); assert.deepEqual(result.types, [1,2,3]);
  }
  // Real WebAudio playback and per-type gate shared across instances.
  await evaluate(`sanyaGame.sound.unlock()` , true);
  await sleep(200);
  const audioCheck = await evaluate(`(async()=>{const {playHitSound}=await import('/sanya-exe/src/lib/media.js');const s=sanyaGame.scene.getScene('Game'), type=s.level.enemies.find(e=>e.id===2);const first=playHitSound(s,type),second=playHitSound(s,type);return {first,second,playing:s.sound.sounds.filter(a=>a.key===type.media.inputSound&&a.isPlaying).length}})()`, true);
  assert.deepEqual(audioCheck, { first: true, second: false, playing: 1 });
  await sleep(1800);
  assert.equal(await evaluate(`(async()=>{const {playHitSound}=await import('/sanya-exe/src/lib/media.js');const s=sanyaGame.scene.getScene('Game');return playHitSound(s,s.level.enemies.find(e=>e.id===2))})()`, true), true);
  // Freeze simulation for controlled trap timing, then verify shared scene damage path.
  const trapCheck = await evaluate(`(()=>{const s=sanyaGame.scene.getScene('Game');s.togglePause();const t=s.traps[0];s.player.body.reset(t.config.x,t.config.y);s.combatTime=100;s.updateTraps();const phase=t.state.phase;s.combatTime=699;s.updateTraps();const before=s.hp;s.combatTime=700;s.updateTraps();return {phase,before,after:s.hp,cooldown:t.state.phase}})()`);
  assert.deepEqual(trapCheck, { phase: 'warning', before: 100, after: 65, cooldown: 'cooldown' });
  const gameShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('test-results/game.png', Buffer.from(gameShot.data, 'base64'));
  await evaluate(`(()=>{const s=sanyaGame.scene.getScene('Game');s.time.paused=false;s.combatTime=5000;s.takeDamage(100,s.traps[0].config)})()`);
  await poll(() => evaluate(`sanyaGame.scene.isActive('End')`), 'trap defeat fallback');
  assert.equal(await evaluate(`!document.querySelector('.trap-defeat')`), true);
  await evaluate(`document.querySelector('#restart').click()`, true);
  await poll(() => evaluate(`sanyaGame.scene.isActive('Game') && sanyaGame.scene.getScene('Game').hp===100`), 'restart');
  assert.equal(await evaluate(`sanyaGame.sound.sounds.filter(s=>s.key.endsWith('.ogg')&&s.isPlaying).length`), 0);
  await evaluate(`(()=>{const s=sanyaGame.scene.getScene('Game');s.physics.pause();s.combatTime=10000;s.takeDamage(0,{id:'smoke-personal',type:'instant_death',photo:'lvl1/face_lvl1.jpg',sound:'lvl2/morda.ogg',message:'Перевірка персональної пастки'})})()`);
  await poll(() => evaluate(`sanyaGame.scene.isActive('End') && Boolean(document.querySelector('.trap-photo'))`), 'personal instant-death screen');
  assert.equal(await evaluate(`document.querySelector('.trap-defeat p').textContent`), 'Перевірка персональної пастки');
  await evaluate(`document.querySelector('#restart').click()`, true);
  await poll(() => evaluate(`sanyaGame.scene.isActive('Game') && sanyaGame.scene.getScene('Game').hp===100`), 'personal trap Restart');
  assert.equal(await evaluate(`sanyaGame.sound.sounds.filter(s=>s.key.endsWith('.ogg')&&s.isPlaying).length`), 0);
  assert.deepEqual(responses, []); assert.deepEqual(errors, []);
  console.log('Browser smoke passed: JPG heads, Opus decode/playback, audio cooldown, menu controls/cleanup, counts/hitboxes, traps, defeat fallback and Restart.');
} finally {
  if (socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch { /* Browser may close before replying. */ } socket.close(); }
  chrome?.kill(); server.kill();
}
