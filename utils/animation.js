export function runAnimation(el, className, timeout) {
  if (!el) return Promise.resolve();
  // Restart the animation if the class is already present
  el.classList.remove(className);
  // Force reflow so the removal is applied
  void el.offsetWidth;

  return new Promise(resolve => {
    const onEnd = () => {
      el.classList.remove(className);
      el.removeEventListener('animationend', onEnd);
      resolve();
    };

    el.addEventListener('animationend', onEnd, { once: true });
    el.classList.add(className);

    if (typeof timeout === 'number') {
      setTimeout(onEnd, timeout);
    }
  });
}
