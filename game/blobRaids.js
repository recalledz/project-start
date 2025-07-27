import { sectSystem } from './sect.js';
import { runAnimation } from '../utils/animation.js';
import addLog from './log.js';
import { BASE_MOVE_SPEED } from './constants.js';
import { flashOrbGlow } from './orbGlow.js';
import { raidState, endRaid } from './raids.js';



// Blobs emerge in waves during raids. One spawns every 10 seconds
// for a total of four attackers.
const SPAWN_INTERVAL = 10000; // ms
const MAX_BLOBS = 4;
// Blobs move at the base unit speed
const BLOB_SPEED = BASE_MOVE_SPEED;
// Blobs attack every 10 seconds
const BLOB_ATTACK_INTERVAL = 10000; // ms
const ORB_ATTACK_INTERVAL = 5000; // ms
const ORB_ATTACK_RANGE = 75; // px
const DISCIPLE_ATTACK_INTERVAL = 10000; // ms
const DISCIPLE_RANGE = 50; // px
const DISCIPLE_DAMAGE = 3;

export const blobs = [];
let spawnTimer = 0;
let orbAttackTimer = 0;
let orbAttackFill = null;
let spawnCount = 0;

export function canSpawn() {
  return !!getMap() && !!getOrb();
}

export function spawnBlob() {
  if (!canSpawn()) return false;
  if (spawnCount >= MAX_BLOBS) return false;
  const blob = createBlob();
  if (blob) {
    blobs.push(blob);
    spawnCount += 1;
    return true;
  }
  return false;
}

function getMap() {
  return document.getElementById('colonyMap');
}

function getOrb() {
  return document.querySelector('#sectOrbs .sect-orb.water');
}

export function showOrbAttackBar() {
  const orb = getOrb();
  if (!orb) return;
  if (orbAttackFill && orbAttackFill.isConnected) return;
  const bar = document.createElement('div');
  bar.className = 'orb-attack-bar';
  const fill = document.createElement('div');
  fill.className = 'orb-attack-fill';
  bar.appendChild(fill);
  orb.appendChild(bar);
  orbAttackFill = fill;
}

export function hideOrbAttackBar() {
  if (orbAttackFill && orbAttackFill.parentElement) {
    orbAttackFill.parentElement.remove();
  }
  orbAttackFill = null;
}

function getOrbAttackFill() {
  if (!orbAttackFill || !orbAttackFill.isConnected) showOrbAttackBar();
  return orbAttackFill;
}

function createBlob() {
  const map = getMap();
  const orb = getOrb();
  if (!map || !orb) return null;
  const mapRect = map.getBoundingClientRect();
  const orbRect = orb.getBoundingClientRect();
  const size = 16;
  const blob = document.createElement('div');
  blob.className = 'slow-blob';
  blob.style.width = `${size}px`;
  blob.style.height = `${size}px`;
  blob.style.position = 'absolute';
  blob.style.borderRadius = '50%';
  blob.style.background = 'purple';
  const leftEye = document.createElement('div');
  leftEye.className = 'blob-eye left';
  const rightEye = document.createElement('div');
  rightEye.className = 'blob-eye right';
  blob.appendChild(leftEye);
  blob.appendChild(rightEye);
  let x = 0;
  let y = 0;
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) {
    x = Math.random() * mapRect.width;
    y = 0 - size;
  } else if (edge === 1) {
    x = Math.random() * mapRect.width;
    y = mapRect.height + size;
  } else if (edge === 2) {
    x = 0 - size;
    y = Math.random() * mapRect.height;
  } else {
    x = mapRect.width + size;
    y = Math.random() * mapRect.height;
  }
  blob.style.left = `${x}px`;
  blob.style.top = `${y}px`;
  const lifeBar = document.createElement('div');
  lifeBar.className = 'blob-life-bar';
  const lifeFill = document.createElement('div');
  lifeFill.className = 'blob-life-fill';
  lifeFill.style.width = '100%';
  lifeBar.appendChild(lifeFill);
  blob.appendChild(lifeBar);
  map.appendChild(blob);
  return {
    el: blob,
    lifeFill,
    x,
    y,
    hp: 20,
    maxHp: 20,
    nextAttack: performance.now() + BLOB_ATTACK_INTERVAL,
    size,
    update(dt) {
      const ox = orbRect.left + orbRect.width / 2 - mapRect.left;
      const oy = orbRect.top + orbRect.height / 2 - mapRect.top;
      const dx = ox - this.x;
      const dy = oy - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const move = Math.min((BLOB_SPEED * dt) / 1000, dist);
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
        this.el.style.left = `${this.x}px`;
        this.el.style.top = `${this.y}px`;
      }
      if (dist <= this.size && performance.now() >= this.nextAttack) {
        sectSystem.orbs.water.current = Math.max(
          0,
          sectSystem.orbs.water.current - 5
        );
        raidState.damageReceived += 5;
        const orbEl = getOrb();
        runAnimation(orbEl, 'orb-hit');
        addLog('SlowBlob hits the Water Orb for 5 damage.', 'damage');
        this.nextAttack = performance.now() + BLOB_ATTACK_INTERVAL;
        if (sectSystem.orbs.water.current <= 0 && raidState.active) {
          endRaid(false);
          return;
        }
      }
    },
    takeDamage(dmg) {
      this.hp = Math.max(0, this.hp - dmg);
      if (this.lifeFill) {
        const pct = (this.hp / this.maxHp) * 100;
        this.lifeFill.style.width = `${pct}%`;
      }
      if (this.hp === 0) {
        runAnimation(this.el, 'blob-burst', 400).then(() => this.el.remove());
        const idx = blobs.indexOf(this);
        if (idx >= 0) blobs.splice(idx, 1);
      }
    }
  };
}

function orbAttack() {
  const orb = getOrb();
  const map = getMap();
  if (!orb || blobs.length === 0 || !map) return;
  const mapRect = map.getBoundingClientRect();
  const orbRect = orb.getBoundingClientRect();
  const ox = orbRect.left + orbRect.width / 2 - mapRect.left;
  const oy = orbRect.top + orbRect.height / 2 - mapRect.top;
  let target = null;
  let minDist = Infinity;
  blobs.forEach(b => {
    const dist = Math.hypot(b.x - ox, b.y - oy);
    if (dist <= ORB_ATTACK_RANGE && dist < minDist) {
      target = b;
      minDist = dist;
    }
  });
  if (target) {
    target.takeDamage(5);
    raidState.damageDealt += 5;
    runAnimation(target.el, 'hit-animate');
    runAnimation(orb, 'orb-burst');
    flashOrbGlow();
    if (orbAttackFill) orbAttackFill.style.width = '0%';
    addLog('Water Orb hits a SlowBlob for 5 damage.', 'damage');
  }
}

function discipleAttack() {
  if (!DISCIPLE_ATTACK_INTERVAL) return;
  const fighters = sectSystem.disciples.filter(d => !d.incapacitated);
  if (fighters.length === 0 || blobs.length === 0) return;
  const now = performance.now();
  fighters.forEach(d => {
    if (!d._attackTimer) d._attackTimer = now + DISCIPLE_ATTACK_INTERVAL;
    if (now >= d._attackTimer) {
      const el = document.querySelector(`.sect-disciple:nth-child(${sectSystem.disciples.indexOf(d)+1})`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const map = getMap();
      const mapRect = map.getBoundingClientRect();
      const px = rect.left + rect.width / 2 - mapRect.left;
      const py = rect.top + rect.height / 2 - mapRect.top;
      let target = null;
      blobs.forEach(b => {
        const dist = Math.hypot(b.x - px, b.y - py);
        if (dist <= DISCIPLE_RANGE && (!target || b.hp < target.hp)) {
          target = b;
        }
      });
      if (target) {
        target.takeDamage(DISCIPLE_DAMAGE);
        raidState.damageDealt += DISCIPLE_DAMAGE;
        d._attackTimer = now + DISCIPLE_ATTACK_INTERVAL;
      }
    }
  });
}

export function tickBlobRaid(delta) {
  spawnTimer += delta;
  orbAttackTimer += delta;
  const fill = getOrbAttackFill();
  if (fill) {
    const ratio = Math.min(1, orbAttackTimer / ORB_ATTACK_INTERVAL);
    fill.style.width = `${ratio * 100}%`;
  }
  blobs.forEach(b => b.update(delta));
  discipleAttack();
  if (orbAttackTimer >= ORB_ATTACK_INTERVAL) {
    orbAttackTimer -= ORB_ATTACK_INTERVAL;
    orbAttack();
  }
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer -= SPAWN_INTERVAL;
    if (spawnCount < MAX_BLOBS) spawnBlob();
  }
}

export function clearBlobs() {
  blobs.forEach(b => b.el.remove());
  blobs.length = 0;
  spawnTimer = 0;
  orbAttackTimer = 0;
  hideOrbAttackBar();
  spawnCount = 0;
}

export function damageClosestBlob(dmg) {
  if (blobs.length === 0) return;
  let target = blobs[0];
  blobs.forEach(b => {
    if (b.hp < target.hp) target = b;
  });
  target.takeDamage(dmg);
  raidState.damageDealt += dmg;
}

export function hasBlobs() {
  return blobs.length > 0;
}

export function raidFinished() {
  return spawnCount >= MAX_BLOBS && blobs.length === 0;
}
