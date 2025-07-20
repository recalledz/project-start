/* badgeBackground.js – loaded _after_ pixi.js‑legacy (and pixi‑filters.umd.js) via plain <script> tags */

let app = null;
const sprites = new Map();
let parchmentTexture = null;

// only once PIXI is loaded will this run
function ensureApp() {
  if (app) return;
  if (
    typeof document === 'undefined' ||
    !globalThis.HTMLCanvasElement
  ) return;

  // create the Application
  app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    transparent: true
  });

  // now that PIXI is definitely there, make the texture
  parchmentTexture = PIXI.Texture.from('img/parchment.jpg');

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
  // guard in case PIXI wasn't loaded or texture failed
  if (!app || !parchmentTexture) return;

  // ← use PIXI.Sprite, not bare Sprite
  const sprite = new PIXI.Sprite(parchmentTexture);

  sprites.set(el, sprite);
  updateSprite(sprite, el);
  app.stage.addChild(sprite);

  new ResizeObserver(() => updateSprite(sprite, el))
    .observe(el);
}
