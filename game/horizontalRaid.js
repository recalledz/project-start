import { createDiscipleBadge } from './badges.js';
import { showRaidDamageFloat } from './rendering.js';
import { applyDamage } from './combat.js';
import { runAnimation } from '../utils/animation.js';

// Delay between waves in milliseconds
const WAVE_DELAY = 5000;

// Parallax layer configuration
const PARALLAX_LAYERS = {
  reeds: { speed: 10, cssVar: '--reeds-offset', img: 'img/reeds-back.png', width: 0 },
  water: { speed: 30, cssVar: '--water-offset', img: 'img/water-mid.png', width: 0 },
  lily: { speed: 60, cssVar: '--lily-offset', img: 'img/lily-pads.png', width: 0 }
};

// populate image widths without hard-coding values
if (typeof Image !== 'undefined') {
  Object.values(PARALLAX_LAYERS).forEach(layer => {
    const img = new Image();
    img.src = layer.img;
    img.onload = () => {
      layer.width = img.width;
    };
  });
}

export function createHorizontalRaid({
  orb,
  disciples = [],
  waves = [],
  onWaveStart = () => {},
  onWaveEnd = () => {},
  onSuccess = () => {},
  onFailure = () => {},
  onDamage = () => {},
  container = document.body
} = {}) {
  const state = {
    orb,
    disciples: disciples.map(d => ({ d, timer: 0, badge: null, sprite: null, startLeft: 0, target: null, overlay: null })),
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
    waveTimer: 0,
    waiting: false,
    active: false,
    onDamage,
    orbFill: null,
    orbEl: null,
    waveTotal: 0,
    waveHp: 0,
    waveLifeFill: null,
    waveLifeLabel: null,
    waveLabel: null,
    selectedBadge: null,
    bgOffsets: Object.fromEntries(Object.keys(PARALLAX_LAYERS).map(k => [k, 0]))
  };

  function buildUI() {
    const root = document.createElement('div');
    root.className = 'raid-container';
    const line = document.createElement('div');
    line.className = 'fight-line';
    root.appendChild(line);

    const info = document.createElement('div');
    info.className = 'wave-info';
    const waveLabel = document.createElement('div');
    waveLabel.className = 'wave-count';
    info.appendChild(waveLabel);
    const lifeBar = document.createElement('div');
    lifeBar.className = 'wave-life-bar';
    const lifeFill = document.createElement('div');
    lifeFill.className = 'wave-life-fill';
    const lifeLabel = document.createElement('div');
    lifeLabel.className = 'wave-life-label';
    lifeBar.appendChild(lifeFill);
    lifeBar.appendChild(lifeLabel);
    info.appendChild(lifeBar);
    root.appendChild(info);
    state.waveLifeFill = lifeFill;
    state.waveLifeLabel = lifeLabel;
    state.waveLabel = waveLabel;

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
      badge.addEventListener('click', () => {
        if (state.selectedBadge) state.selectedBadge.classList.remove('selected');
        state.selectedBadge = badge;
        badge.classList.add('selected');
        window.dispatchEvent(
          new CustomEvent('open-disciple-overlay', { detail: slot.d })
        );
      });
      root.appendChild(badge);
      const sprite = document.createElement('div');
      sprite.className = 'raid-disciple';
      sprite.style.left = `${50 + i * 30}px`;
      const overlay = document.createElement('div');
      overlay.className = 'raid-attack-shadow';
      sprite.appendChild(overlay);
      root.appendChild(sprite);
      slot.badge = badge;
      slot.sprite = sprite;
      slot.overlay = overlay;
      slot.startLeft = 50 + i * 30;
    });
    state.container.appendChild(root);
    state.root = root;
  }

  function updateBackground(dt) {
    const offs = state.bgOffsets;
    for (const [name, cfg] of Object.entries(PARALLAX_LAYERS)) {
      offs[name] -= (dt * cfg.speed) / 1000;
      if (cfg.width) offs[name] %= cfg.width;
      if (state.container) {
        state.container.style.setProperty(cfg.cssVar, `${offs[name]}px`);
      }
    }
  }
  
  function updateWaveLife() {
    if (!state.waveLifeFill) return;
    const pct = state.waveTotal > 0 ? (state.waveHp / state.waveTotal) * 100 : 0;
    state.waveLifeFill.style.width = `${pct}%`;
    if (state.waveLifeLabel) {
      state.waveLifeLabel.textContent = `${Math.round(state.waveHp)}/${Math.round(state.waveTotal)}`;
    }
  }

  function removeDisciple(slot) {
    slot.sprite?.remove();
    slot.badge?.remove();
    const idx = state.disciples.indexOf(slot);
    if (idx >= 0) state.disciples.splice(idx, 1);
  }

  function waterBurst(damage) {
    state.raiders.slice().forEach(r => {
      const before = r.hp;
      r.hp = Math.max(0, r.hp - damage);
      const dealt = before - r.hp;
      state.waveHp = Math.max(0, state.waveHp - dealt);
      showRaidDamageFloat(r.el, dealt, true);
      if (r.hp === 0) {
        r.el.remove();
        const idx = state.raiders.indexOf(r);
        if (idx >= 0) state.raiders.splice(idx, 1);
        state.disciples.forEach(s => {
          if (s.target === r) s.target = null;
        });
      }
    });
    updateWaveLife();
  }

  function beginWave(index) {
    state.waveIndex = index;
    const wave = state.waves[index];
    if (!wave) return;
    state.waveTotal = wave.stats.hp * wave.count;
    state.waveHp = state.waveTotal;
    if (state.waveLabel) {
      state.waveLabel.textContent = `Wave ${index + 1}/${state.waves.length}`;
    }
    updateWaveLife();
    state.onWaveStart(index);
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
      moveSpeed: stats.moveSpeed,
      progress: 1,
      timer: 0,
      el
    });
  }


  function updateRaiders(dt) {
    state.raiders.forEach(r => {
      if (r.progress > 0.5) {
        r.progress -= r.moveSpeed * dt;
        if (r.el) r.el.style.left = `${r.progress * 100}%`;
        return;
      }

      const living = state.disciples.filter(
        s => !s.d.incapacitated && s.d.currentHp > 0
      );
      if (living.length === 0) {
        r.progress -= r.moveSpeed * dt;
        if (r.progress <= 0) {
          state.orb.current = Math.max(0, state.orb.current - r.damage);
          state.onDamage({ amount: r.damage, source: 'raider' });
          if (state.orbFill) {
            state.orbFill.style.height = `${(state.orb.current / state.orb.max) * 100}%`;
          }
          showRaidDamageFloat(state.orbEl, r.damage);
          state.waveHp = Math.max(0, state.waveHp - r.hp);
          runAnimation(r.el, 'attack-flash');
          r.el.remove();
          const idx = state.raiders.indexOf(r);
          if (idx >= 0) state.raiders.splice(idx, 1);
          updateWaveLife();
          if (state.orb.current <= 0) end(false);
          return;
        }
        if (r.el) r.el.style.left = `${r.progress * 100}%`;
        return;
      }

      const target = living.sort((a, b) => b.startLeft - a.startLeft)[0];
      r.timer += dt;
      if (r.timer >= r.attackSpeed) {
        r.timer -= r.attackSpeed;
        applyDamage(target.d, r.damage);
        state.onDamage({ amount: r.damage, source: 'raider' });
        showRaidDamageFloat(target.sprite, r.damage);
        runAnimation(r.el, 'attack-flash');
        if (target.d.currentHp <= 0 || target.d.incapacitated) {
          removeDisciple(target);
        }
      }
    });
  }

  function updateDisciples(dt) {
    const livingRaiders = state.raiders;
    state.disciples.slice().forEach(slot => {
      if (slot.d.currentHp <= 0 || slot.d.incapacitated) {
        removeDisciple(slot);
        return;
      }

      if (!slot.target || slot.target.hp <= 0 || !livingRaiders.includes(slot.target)) {
        slot.target = null;
        if (livingRaiders.length > 0) {
          slot.target = livingRaiders.slice().sort((a, b) => a.progress - b.progress)[0];
        }
        if (!slot.target) {
          slot.timer = 0;
          slot.sprite?.classList.remove('attacking');
          if (slot.overlay) slot.overlay.style.height = '0%';
          return;
        }
      }

      slot.sprite?.classList.add('attacking');
      slot.timer += dt;
      const ratio = Math.min(1, slot.timer / slot.d.attackSpeed);
      if (slot.overlay) slot.overlay.style.height = `${(1 - ratio) * 100}%`;
      if (slot.timer >= slot.d.attackSpeed) {
        slot.timer -= slot.d.attackSpeed;
        const r = slot.target;
        const before = r.hp;
        r.hp = Math.max(0, r.hp - slot.d.damage);
        const dealt = before - r.hp;
        state.waveHp = Math.max(0, state.waveHp - dealt);
        state.onDamage({ amount: slot.d.damage, source: 'disciple' });
        showRaidDamageFloat(r.el, slot.d.damage, true);
        runAnimation(slot.sprite, 'attack-flash');
        if (slot.overlay) slot.overlay.style.height = '100%';
        if (r.hp === 0) {
          r.el.remove();
          const idx = state.raiders.indexOf(r);
          if (idx >= 0) state.raiders.splice(idx, 1);
          state.disciples.forEach(s => {
            if (s.target === r) s.target = null;
          });
        }
        updateWaveLife();
      }
    });
  }

  function spawnLoop(dt) {
    const wave = state.waves[state.waveIndex];
    if (!wave) return;
    if (state.waiting) {
      state.waveTimer += dt;
      if (state.waveTimer >= WAVE_DELAY) {
        state.waiting = false;
        state.waveTimer = 0;
        beginWave(state.waveIndex);
      }
      return;
    }
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
      const next = state.waveIndex + 1;
      state.spawnIndex = 0;
      state.spawnTimer = 0;
      if (next >= state.waves.length) {
        end(true);
      } else {
        state.waveIndex = next;
        state.waiting = true;
      }
    }
  }

  function end(success) {
    if (!state.active) return;
    state.active = false;
    state.root?.remove();
    if (state.selectedBadge) {
      state.selectedBadge.classList.remove('selected');
      state.selectedBadge = null;
    }
    state.raiders.length = 0;
    state.disciples.forEach(slot => {
      slot.target = null;
      if (slot.sprite) slot.sprite.classList.remove('attacking');
      if (slot.overlay) slot.overlay.style.height = '0%';
    });
    state.onWaveEnd(state.waveIndex);
    success ? state.onSuccess() : state.onFailure();
  }

  function tick(dt) {
    if (!state.active) return;
    updateBackground(dt);
    spawnLoop(dt);
    // dt is in milliseconds; use same unit for attack timers
    updateRaiders(dt);
    updateDisciples(dt);
  }

  buildUI();

  return {
    start: () => {
      state.active = true;
      state.waiting = false;
      state.waveTimer = 0;
      beginWave(0);
    },
    tick,
    end,
    castWaterBurst: waterBurst
  };
}
