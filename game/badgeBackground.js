/* global PIXI */

let app = null;
// track containers for each badge element
const sprites = new Map();
// load textures for bamboo border and parchment background
const bambooTexture = PIXI.Texture.from(
  new URL('../img/bamboo.png', import.meta.url).href
);
const parchmentTexture = PIXI.Texture.from(
  new URL('../img/parchment.png', import.meta.url).href
);
const PARCHMENT_SCALE = 0.9;

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

function updateContainer(objs, el) {
  const r = el.getBoundingClientRect();
  const { container, bamboo, parchment } = objs;
  const { width, height } = r;
  container.pivot.set(width / 2, height / 2);
  container.x = r.left + width / 2;
  container.y = r.top + height / 2;
  Object.assign(bamboo, { width, height, x: 0, y: 0 });
  Object.assign(parchment, { width, height });
  parchment.position = bamboo.position;
  parchment.scale.set(PARCHMENT_SCALE);
}

function updateAll() {
  sprites.forEach((objs, el) => updateContainer(objs, el));
}

export function applyBadgeTexture(el) {
  ensureApp();

  if (!app) return;

  const container = new PIXI.Container();
  const parchment = new PIXI.Sprite(parchmentTexture);
  parchment.anchor.set(0.5);
  const bamboo = new PIXI.Sprite(bambooTexture);
  bamboo.anchor.set(0.5);

  container.addChild(parchment);
  container.addChild(bamboo);

  const objs = { container, bamboo, parchment };

  sprites.set(el, objs);
  updateContainer(objs, el);
  app.stage.addChild(container);

  new ResizeObserver(() => updateContainer(objs, el))
    .observe(el);
}
