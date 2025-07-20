/* global PIXI */

let app = null;
const sprites = new Map();
const parchmentTexture = PIXI.Texture.from('img/parchment.jpg');

function ensureApp() {
  if (app) return;
  if (
    typeof document === 'undefined' ||
    !globalThis.HTMLCanvasElement
  ) {
    // Skip if canvas is unavailable (e.g. during server-side tests)
    return;
  }
  const testCanvas = document.createElement('canvas');
  if (!testCanvas.getContext || !testCanvas.getContext('2d')) return;
  try {
    app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0
    });
  } catch (e) {
    console.error('PIXI init failed', e);
    return;
  }
  app.view.classList.add('badge-texture-layer');
  app.view.style.position = 'fixed';
  app.view.style.top = '0';
  app.view.style.left = '0';
  app.view.style.pointerEvents = 'none';
  document.body.appendChild(app.view);
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    updateAll();
  });
  window.addEventListener('scroll', updateAll);
}

function updateSprite(sprite, el) {
  const rect = el.getBoundingClientRect();
  sprite.x = rect.left;
  sprite.y = rect.top;
  sprite.width = rect.width;
  sprite.height = rect.height;
}

function updateAll() {
  sprites.forEach((sprite, el) => updateSprite(sprite, el));
}

export function applyBadgeTexture(el) {
  ensureApp();
  if (!app) return;
  const sprite = new PIXI.Sprite(parchmentTexture);

  sprites.set(el, sprite);
  updateSprite(sprite, el);
  app.stage.addChild(sprite);
  const ro = new ResizeObserver(() => updateSprite(sprite, el));
  ro.observe(el);
}
