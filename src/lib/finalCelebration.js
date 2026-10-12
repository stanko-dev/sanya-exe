import { finalPhotoPaths, mediaUrl } from './media.js';
import { memeContent, memeCombination } from '../config/memes.js';

export const finalLimits = { maxCards: 38, intervalMs: 900 };
export function attachFinalCelebration(scene) {
  const layer = document.querySelector('.final-fall');
  const credit = document.querySelector('.final-friends');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const photos = finalPhotoPaths(), cards = [], animations = new Set();
  let photoQueue = [], photoIndex = 0;
  let timer;
  const animate = (node, frames, options) => {
    const animation = node.animate(frames, options); animations.add(animation);
    animation.onfinish = () => { animations.delete(animation); animation.cancel(); };
  };
  const spawn = (staticCard = false) => {
    if (photos.length && photoIndex >= photoQueue.length) return;
    if (!photos.length && cards.length >= finalLimits.maxCards) cards.shift().remove();
    const card = document.createElement('div'); card.className = 'final-card';
    if (photos.length) {
      const image = document.createElement('img'); image.src = mediaUrl(photoQueue[photoIndex++]); image.alt = '';
      image.onerror = () => { card.textContent = memeCombination(); }; card.append(image);
    } else card.textContent = memeCombination();
    // Alternate side lanes so the central portrait never hides the falling photos.
    const x = (cards.length % 2 === 0 ? 2 : 76) + Math.random() * 10;
    const angle = -25 + Math.random() * 50;
    const bottom = Math.min(20, Math.floor(cards.length / 4) * 3) + Math.random() * 2;
    card.style.left = `${x}%`; card.style.bottom = `${bottom}%`;
    card.style.transform = `rotate(${angle}deg)`;
    layer.append(card); cards.push(card);
    if (!staticCard && card.animate) {
      animate(card, [
        { transform: `translateY(${-layer.clientHeight - 180}px) rotate(${angle - 130}deg)` },
        { transform: `translateY(-18px) rotate(${angle + 8}deg)`, offset: 0.88 },
        { transform: `translateY(0) rotate(${angle}deg)` },
      ], { duration: 3800 + Math.random() * 1400, easing: 'ease-in' });
    }
  };
  const reset = () => {
    timer?.remove();
    for (const animation of animations) animation.cancel(); animations.clear();
    for (const card of cards) card.remove(); cards.length = 0;
    photoQueue = [...photos]; photoIndex = 0;
    // Shuffle once; every real photograph appears exactly once and stays in the pile.
    for (let i = photoQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photoQueue[i], photoQueue[j]] = [photoQueue[j], photoQueue[i]];
    }
    if (photos.length) {
      if (motion.matches) { for (let i = 0; i < photos.length; i++) spawn(true); }
      else spawn();
    } else for (let i = 0; i < 8; i++) spawn(true);
    if (motion.matches) return;
    timer = scene.time.addEvent({ delay: finalLimits.intervalMs, loop: true, callback: () => {
      spawn();
      if (photos.length && photoIndex >= photos.length) timer.remove();
    } });
  };
  credit.textContent = memeContent.final.friends;
  reset(); motion.addEventListener('change', reset);
  scene.events.once('shutdown', () => {
    motion.removeEventListener('change', reset); timer?.remove();
    for (const animation of animations) animation.cancel(); animations.clear();
    for (const card of cards) card.remove();
  });
}
