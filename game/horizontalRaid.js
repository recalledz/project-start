import { createDiscipleBadge } from './badges.js';
import { showRaidDamageFloat } from './rendering.js';

// Multiply raider movement speed by this factor
const RAIDER_SPEED_MULTIPLIER = 3;

// Multiply raider movement speed by this factor
const RAIDER_SPEED_MULTIPLIER = 3;

export function createHorizontalRaid({ orb, disciples = [], waves = [], onWaveStart = () => {}, onWaveEnd = () => {}, onSuccess = () => {}, onFailure = () => {}, onDamage = () => {}, container = document.body } = {}) {
  const state = {
    orb,
    disciples: disciples.map(d => ({ d, engaged: null, timer: 0, badge: null, sprite: null, startLeft: 0 })),
    waves,
    onWaveStart,
    onWaveEnd,
    onSuccess,
    onFailure,
    container,
    root: null,
    raiders: [],
    waveIndex: 0,
    spawnIndex: 0,
    spawnTimer: 0,
    active: false,
    onDamage,
    orbFill: null,
    orbEl: null
  };

  function buildUI() {
    const root = document.createElement('div');
    root.className = 'raid-container';
    const line = document.createElement('div');
    line.className = 'fight-line';
    root.appendChild(line);

    const orbEl = document.createElement('div');
    orbEl.className = 'raid-orb sect-orb water';
    const fill = document.createElement('div');
    fill.className = 'orb-fill';
    fill.style.height = `${(state.orb.current / state.orb.max) * 100}%`;
    orbEl.appendChild(fill);
    root.appendChild(orbEl);
    state.orbFill = fill;
    state.orbEl = orbEl;

    state.disciples.forEach((slot, i) => {
      const badge = createDiscipleBadge(slot.d);
      badge.style.position = 'absolute';
      badge.style.left = `${10 + i * 80}px`;
      badge.style.top = '4px';
      root.appendChild(badge);
      const sprite = document.createElement('div');
      sprite.className = 'raid-disciple';
      sprite.style.left = `${50 + i * 30}px`;
      root.appendChild(sprite);
      slot.badge = badge;
      slot.sprite = sprite;
      slot.startLeft = 50 + i * 30;
    });
    state.container.appendChild(root);
    state.root = root;
  }

  function spawnRaider(stats) {
    const el = document.createElement('div');
    el.className = 'raider-unit';
    el.style.left = '100%';
    state.root.appendChild(el);
    state.raiders.push({
      hp: stats.hp,
      damage: stats.damage,
      attackSpeed: stats.attackSpeed,
      moveSpeed: stats.moveSpeed * RAIDER_SPEED_MULTIPLIER,
      progress: 1,
      timer: 0,
      el,
      engaged: null
    });
  }

  function tryEngage(r) {
    const slot = state.disciples.find(s => !s.engaged && !s.d.incapacitated);
    if (!slot) return false;
    r.engaged = slot;
    slot.engaged = r;
    r.progress = 0.5;
    if (slot.sprite) slot.sprite.style.left = '45%';
    if (r.el) r.el.style.left = '55%';
    return true;
  }

  function updateRaiders(dt) {
    state.raiders.forEach(r => {
      if (r.engaged) {
        r.timer += dt;
        const d = r.engaged;
        d.timer += dt;
        if (r.timer >= r.attackSpeed) {
          r.timer -= r.attackSpeed;
          d.d.currentHp = Math.max(0, d.d.currentHp - r.damage);
          state.onDamage({ amount: r.damage, source: 'raider' });
          showRaidDamageFloat(d.sprite, r.damage);
          if (d.d.currentHp === 0) {
            d.engaged = null;
            r.engaged = null;
            if (d.sprite) d.sprite.style.left = `${d.startLeft}px`;
          }
        }
        if (d.timer >= d.d.attackSpeed && r.engaged) {
          d.timer -= d.d.attackSpeed;
          r.hp = Math.max(0, r.hp - d.d.damage);
          state.onDamage({ amount: d.d.damage, source: 'disciple' });
          showRaidDamageFloat(r.el, d.d.damage);
          if (r.hp === 0) {
            r.el.remove();
            const idx = state.raiders.indexOf(r);
            if (idx >= 0) state.raiders.splice(idx, 1);
            d.engaged = null;
            if (d.sprite) d.sprite.style.left = `${d.startLeft}px`;
          }
        }
      } else {
        r.progress -= r.moveSpeed * dt;
        if (r.progress <= 0.5) {
          if (!tryEngage(r)) {
            r.progress -= r.moveSpeed * dt;
          }
        }
        if (r.progress <= 0) {
          state.orb.current = Math.max(0, state.orb.current - r.damage);
          if (state.orbFill) {
            state.orbFill.style.height = `${(state.orb.current / state.orb.max) * 100}%`;
          }
          state.onDamage({ amount: r.damage, source: 'raider' });
          showRaidDamageFloat(state.orbEl, r.damage);
          r.el.remove();
          const idx = state.raiders.indexOf(r);
          if (idx >= 0) state.raiders.splice(idx, 1);
          if (state.orb.current <= 0) end(false);
        }
        if (r.el) r.el.style.left = `${r.progress * 100}%`;
      }
    });
  }

  function spawnLoop(dt) {
    const wave = state.waves[state.waveIndex];
    if (!wave) return;
    if (state.spawnIndex < wave.count) {
      state.spawnTimer += dt;
      if (state.spawnTimer >= wave.rate) {
        state.spawnTimer -= wave.rate;
        spawnRaider(wave.stats);
        state.spawnIndex += 1;
      }
    }
    if (state.spawnIndex >= wave.count && state.raiders.length === 0) {
      state.onWaveEnd(state.waveIndex);
      state.waveIndex += 1;
      state.spawnIndex = 0;
      state.spawnTimer = 0;
      if (state.waveIndex >= state.waves.length) {
        end(true);
      } else {
        state.onWaveStart(state.waveIndex);
      }
    }
  }

  function end(success) {
    if (!state.active) return;
    state.active = false;
    state.root?.remove();
    state.raiders.length = 0;
    state.disciples.forEach(slot => {
      slot.engaged = null;
      if (slot.sprite) slot.sprite.style.left = `${slot.startLeft}px`;
    });
    state.onWaveEnd(state.waveIndex);
    success ? state.onSuccess() : state.onFailure();
  }

  function tick(dt) {
    if (!state.active) return;
    spawnLoop(dt);
    updateRaiders(dt / 1000);
  }

  buildUI();

  return { start: () => { state.active = true; state.onWaveStart(0); }, tick, end };
}
