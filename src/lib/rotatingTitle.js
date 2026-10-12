import { memeContent } from '../config/memes.js';

export function attachRotatingTitle(scene) {
  const node = document.getElementById('meme-title');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, animation;
  const render = () => {
    node.textContent = memeContent.names[index];
    document.title = `${memeContent.names[index]} — ${memeContent.subtitle}`;
    const brand = document.getElementById('brand-name');
    if (brand) brand.textContent = memeContent.names[index];
  };
  render();
  const timer = scene.time.addEvent({ delay: 2000, loop: true, callback: () => {
    index = (index + 1) % memeContent.names.length;
    if (motion.matches || !node.animate) { render(); return; }
    animation?.cancel();
    animation = node.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(8px)' }], { duration: 220 });
    animation.onfinish = () => {
      render(); animation = node.animate([{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260 });
    };
  } });
  scene.events.once('shutdown', () => { timer.remove(); animation?.cancel(); });
}
