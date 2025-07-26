import * as PIXI from '../pixi.min.js';

let orbSprite = null;
let glowFilter = null;
let app = null;
let enabled = false;
let time = 0;
let orbRadius = 0;
let particleContainer = null;
const particles = [];
let flashTime = 0;
const DEFAULT_OUTER = 4;
const DEFAULT_INNER = 1;

function resetParticle(p) {
  if (!p || !orbRadius) return;
  p.life = 0.5 + Math.random() * 1.5;
  p.maxLife = p.life;
  const angle = Math.random() * Math.PI * 2;
  const speed = 20 + Math.random() * 30;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.sprite.x = orbRadius;
  p.sprite.y = orbRadius;
  p.sprite.alpha = 1;
  const scale = 0.5 + Math.random() * 0.5;
  p.sprite.scale.set(scale);
}

export function attachOrbGlow(element) {
  if (!element || orbSprite) return;
  const { clientWidth: w, clientHeight: h } = element;
  if (!w || !h) return;
  app = new PIXI.Application({ width: w, height: h, transparent: true });
  const canvas = app.view;
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.pointerEvents = 'none';
  element.appendChild(canvas);
  orbSprite = new PIXI.Graphics();
  orbSprite.beginFill(0xffffff, 0);
  orbSprite.drawCircle(w / 2, h / 2, Math.min(w, h) / 2);
  orbSprite.endFill();
  app.stage.addChild(orbSprite);
  orbRadius = Math.min(w, h) / 2;
  particleContainer = new PIXI.Container();
  particleContainer.visible = false;
  app.stage.addChild(particleContainer);
  for (let i = 0; i < 20; i++) {
    const g = new PIXI.Graphics();
    g.beginFill(0x7fd9ff);
    g.drawCircle(0, 0, 2);
    g.endFill();
    g.blendMode = PIXI.BLEND_MODES.ADD;
    particleContainer.addChild(g);
    particles.push({ sprite: g, vx: 0, vy: 0, life: 0, maxLife: 0 });
    resetParticle(particles[i]);
  }
  glowFilter = new PIXI.filters.GlowFilter({
    distance: 30,
    outerStrength: 4,
    innerStrength: 1,
    color: 0x7fd9ff
  });
  orbSprite.filters = [];
}

export function enableOrbGlow() {
  if (!orbSprite) return;
  orbSprite.filters = [glowFilter];
  if (particleContainer) particleContainer.visible = true;
  enabled = true;
  particles.forEach(resetParticle);
}

export function disableOrbGlow() {
  if (!orbSprite) return;
  orbSprite.filters = [];
  if (particleContainer) particleContainer.visible = false;
  enabled = false;
}

export function flashOrbGlow(duration = 0.3) {
  if (!glowFilter) return;
  if (!enabled) enableOrbGlow();
  flashTime = Math.max(flashTime, duration);
  glowFilter.outerStrength = DEFAULT_OUTER * 1.5;
  glowFilter.innerStrength = DEFAULT_INNER * 1.5;
}

export function updateOrbGlow(delta) {
  if (!glowFilter || !enabled) return;
  time += delta / 1000;
  glowFilter.distance = 30 + Math.sin(time) * 5;
  if (flashTime > 0) {
    flashTime -= delta / 1000;
    if (flashTime <= 0) {
      glowFilter.outerStrength = DEFAULT_OUTER;
      glowFilter.innerStrength = DEFAULT_INNER;
    }
  }
  particles.forEach(p => {
    p.life -= delta / 1000;
    p.sprite.x += p.vx * (delta / 1000);
    p.sprite.y += p.vy * (delta / 1000);
    p.sprite.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) resetParticle(p);
  });
}
