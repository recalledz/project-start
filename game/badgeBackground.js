/* global PIXI */

let app = null;
const sprites = new Map();
const parchmentTexture = PIXI.Texture.from('img/parchment.jpg');

// only once PIXI is loaded will this run
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
  Object.assign(app.view.style, {
    position: 'fixed',
    top:       '0',
    left:      '0',
    pointerEvents: 'none'
  });
  document.body.appendChild(app.view);

  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    updateAll();
  });
  window.addEventListener('scroll', updateAll);
}

function updateSprite(sprite, el) {
  const r = el.getBoundingClientRect();
  Object.assign(sprite, {
    x: r.left,
    y: r.top,
    width:  r.width,
    height: r.height
  });
}

function updateAll() {
  sprites.forEach((spr, el) => updateSprite(spr, el));
}

export function applyBadgeTexture(el) {
  ensureApp();

  if (!app) return;

  const sprite = new PIXI.Sprite(parchmentTexture);

  sprites.set(el, sprite);
  updateSprite(sprite, el);
  app.stage.addChild(sprite);

  new ResizeObserver(() => updateSprite(sprite, el))
    .observe(el);
}
