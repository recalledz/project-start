/* global PIXI */

let app = null;
// track containers for each badge element
const sprites = new Map();
// load textures for bamboo border and parchment background
// Parcel only bundles assets that are referenced via import
import bambooUrl from '../img/bamboo.png';
import parchmentUrl from '../img/parchment.png';

const bambooTexture = PIXI.Texture.from(bambooUrl);
const parchmentTexture = PIXI.Texture.from(parchmentUrl);

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
  Object.assign(container, { x: r.left, y: r.top });
  Object.assign(bamboo, { width: r.width, height: r.height });
  const pad = 4;
  Object.assign(parchment, {
    x: pad,
    y: pad,
    width: Math.max(0, r.width - pad * 2),
    height: Math.max(0, r.height - pad * 2)
  });
}

function updateAll() {
  sprites.forEach((objs, el) => updateContainer(objs, el));
}

export function applyBadgeTexture(el) {
  ensureApp();

  if (!app) return;

  const container = new PIXI.Container();
  const bamboo = new PIXI.Sprite(bambooTexture);
  const parchment = new PIXI.Sprite(parchmentTexture);

  container.addChild(bamboo);
  container.addChild(parchment);

  const objs = { container, bamboo, parchment };

  sprites.set(el, objs);
  updateContainer(objs, el);
  app.stage.addChild(container);

  new ResizeObserver(() => updateContainer(objs, el))
    .observe(el);
}
