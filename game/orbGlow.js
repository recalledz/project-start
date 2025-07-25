import * as PIXI from '../pixi.min.js';

let orbSprite = null;
let glowFilter = null;
let app = null;
let enabled = false;
let time = 0;

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
  glowFilter = new PIXI.filters.GlowFilter({
    distance: 30,
    outerStrength: 2.5,
    innerStrength: 0.5,
    color: 0xffffff
  });
  orbSprite.filters = [];
}

export function enableOrbGlow() {
  if (!orbSprite) return;
  orbSprite.filters = [glowFilter];
  enabled = true;
}

export function disableOrbGlow() {
  if (!orbSprite) return;
  orbSprite.filters = [];
  enabled = false;
}

export function updateOrbGlow(delta) {
  if (!glowFilter || !enabled) return;
  time += delta / 1000;
  glowFilter.distance = 30 + Math.sin(time) * 5;
}
