import { finalPhotoPaths, mediaUrl } from './media.js';
import { memeContent, memeCombination } from '../config/memes.js';

export const finalLimits = { maxCards: 38, intervalMs: 900 };
export function attachFinalCelebration(scene) {
  const layer = document.querySelector('.final-fall');
  const credit = document.querySelector('.final-friends');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const photos = finalPhotoPaths(), cards = [], animations = new Set();
  let photoQueue = [], photoIndex = 0;
  let timer, creditTimer;
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
    const x = 2 + Math.random() * 83, angle = -35 + Math.random() * 70;
    const bottom = Math.min(18, Math.floor(cards.length / 9) * 2.2) + Math.random() * 3;
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
  const showFriends = () => {
    if (motion.matches || !credit.animate) return;
    animate(credit, [
      { opacity: 0, transform: 'translateY(-20px)' },
      { opacity: 1, transform: 'translateY(0)', offset: 0.12 },
      { opacity: 1, transform: 'translateY(0)', offset: 0.7 },
      { opacity: 0, transform: 'translateY(160px)' },
    ], { duration: 10000 });
  };
  const reset = () => {
    timer?.remove(); creditTimer?.remove();
    for (const animation of animations) animation.cancel(); animations.clear();
    for (const card of cards) card.remove(); cards.length = 0;
    photoQueue = [...photos]; photoIndex = 0;
    // Shuffle once; every real photograph appears exactly once and stays in the pile.
    for (let i = photoQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [photoQueue[i], photoQueue[j]] = [photoQueue[j], photoQueue[i]];
    }
    credit.classList.toggle('moving-credits', !motion.matches && Boolean(credit.animate));
    if (photos.length) {
      if (motion.matches) { for (let i = 0; i < photos.length; i++) spawn(true); }
      else spawn();
    } else for (let i = 0; i < 8; i++) spawn(true);
    if (motion.matches) return;
    showFriends();
    timer = scene.time.addEvent({ delay: finalLimits.intervalMs, loop: true, callback: () => {
      spawn();
      if (photos.length && photoIndex >= photos.length) timer.remove();
    } });
    creditTimer = scene.time.addEvent({ delay: 11000, loop: true, callback: showFriends });
  };
  credit.textContent = memeContent.final.friends;
  reset(); motion.addEventListener('change', reset);
  scene.events.once('shutdown', () => {
    motion.removeEventListener('change', reset); timer?.remove(); creditTimer?.remove();
    for (const animation of animations) animation.cancel(); animations.clear();
    for (const card of cards) card.remove();
  });
}
