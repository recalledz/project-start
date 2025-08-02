import { sectSystem } from './sect.js';
import { runAnimation } from '../utils/animation.js';
import addLog from './log.js';
import { BASE_MOVE_SPEED } from './constants.js';
import { flashOrbGlow } from './orbGlow.js';
import bus from './canBus.js';
import { createMapSplatter } from './rendering.js';



// Blobs emerge in waves during raids. One spawns every 10 seconds
// for a total of four attackers.
const SPAWN_INTERVAL = 10000; // ms
const MAX_BLOBS = 4;
// Blobs move at half the base unit speed
const BLOB_SPEED = BASE_MOVE_SPEED / 2;
// Blobs attack every 10 seconds
const BLOB_ATTACK_INTERVAL = 10000; // ms
const ORB_ATTACK_INTERVAL = 5000; // ms
const ORB_ATTACK_RANGE = 75; // px
const DISCIPLE_ATTACK_INTERVAL = 5000; // ms
const DISCIPLE_RANGE = 100; // px search radius to chase disciples
const BLOB_ATTACK_RANGE = 100; // px distance to stop and attack disciples
const BLOB_ORB_ATTACK_RANGE = 100; // px distance from orb center to begin attacks
const DISCIPLE_DAMAGE = 3;
const IN_MAP_BORDER = 8; // px blob must cross into view before interactions

let activeRaid = false;

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
    inMap: false,
    hp: 20,
    maxHp: 20,
    nextAttack: performance.now() + BLOB_ATTACK_INTERVAL,
    size,
    update(dt) {
      const mapRect = map.getBoundingClientRect();
      const orbRect = orb.getBoundingClientRect();
      const cx = this.x + this.size / 2;
      const cy = this.y + this.size / 2;
      if (!this.inMap) {
        if (
          cx >= IN_MAP_BORDER &&
          cy >= IN_MAP_BORDER &&
          cx <= mapRect.width - IN_MAP_BORDER &&
          cy <= mapRect.height - IN_MAP_BORDER
        ) {
          this.inMap = true;
        }
      }
      let target = null;
      let targetPos = null;
      let min = Infinity;
      const now = performance.now();
      if (this.inMap) {
        sectSystem.disciples.forEach(d => {
          if (d.incapacitated) return;
          const el = document.querySelector(`[data-disciple-id="${d.id}"]`);
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const px = rect.left + rect.width / 2 - mapRect.left;
          const py = rect.top + rect.height / 2 - mapRect.top;
          const dd = Math.hypot(px - cx, py - cy);
          if (dd <= DISCIPLE_RANGE && dd < min) {
            min = dd;
            target = d;
            targetPos = { x: px, y: py, dist: dd };
          }
        });
      }

      if (target && targetPos) {
        const dx = targetPos.x - cx;
        const dy = targetPos.y - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > BLOB_ATTACK_RANGE) {
          const move = Math.min((BLOB_SPEED * dt) / 1000, dist - BLOB_ATTACK_RANGE);
          this.x += (dx / dist) * move;
          this.y += (dy / dist) * move;
          this.el.style.left = `${this.x}px`;
          this.el.style.top = `${this.y}px`;
        } else if (now >= this.nextAttack && this.inMap) {
          bus.publish('BLOB_ATTACK_DISCIPLE', { id: target.id, damage: 2 });
          this.nextAttack = now + BLOB_ATTACK_INTERVAL;
        }
      } else {
        const ox = orbRect.left + orbRect.width / 2 - mapRect.left;
        const oy = orbRect.top + orbRect.height / 2 - mapRect.top;
        const dx = ox - cx;
        const dy = oy - cy;
        const dist = Math.hypot(dx, dy);
        const targetDist = BLOB_ORB_ATTACK_RANGE;
        if (dist > targetDist) {
          const move = Math.min((BLOB_SPEED * dt) / 1000, dist - targetDist);
          this.x += (dx / dist) * move;
          this.y += (dy / dist) * move;
          this.el.style.left = `${this.x}px`;
          this.el.style.top = `${this.y}px`;
        } else if (now >= this.nextAttack && this.inMap) {
          bus.publish('BLOB_ATTACK_ORB', { damage: 2 });
          this.nextAttack = now + BLOB_ATTACK_INTERVAL;
        }
      }
    },
    takeDamage(dmg) {
      this.hp = Math.max(0, this.hp - dmg);
      if (this.lifeFill) {
        const pct = (this.hp / this.maxHp) * 100;
        this.lifeFill.style.width = `${pct}%`;
      }
      createMapSplatter(this.x, this.y);
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
    if (!b.inMap) return;
    const cx = b.x + b.size / 2;
    const cy = b.y + b.size / 2;
    const dist = Math.hypot(cx - ox, cy - oy);
    if (dist <= ORB_ATTACK_RANGE && dist < minDist) {
      target = b;
      minDist = dist;
    }
  });
  if (target) {
    target.takeDamage(2);
    bus.publish('RAID_DAMAGE_DEALT', { amount: 2 });
    runAnimation(target.el, 'hit-animate');
    runAnimation(orb, 'orb-burst');
    flashOrbGlow();
    if (orbAttackFill) orbAttackFill.style.width = '0%';
    addLog('Water Orb hits a SlowBlob for 2 damage.', 'damage');
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
      const el = document.querySelector(`[data-disciple-id="${d.id}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const map = getMap();
      const mapRect = map.getBoundingClientRect();
      const px = rect.left + rect.width / 2 - mapRect.left;
      const py = rect.top + rect.height / 2 - mapRect.top;
      let target = null;
      blobs.forEach(b => {
        if (!b.inMap) return;
        const cx = b.x + b.size / 2;
        const cy = b.y + b.size / 2;
        const dist = Math.hypot(cx - px, cy - py);
        if (dist <= DISCIPLE_RANGE && (!target || b.hp < target.hp)) {
          target = b;
        }
      });
      if (target) {
        target.takeDamage(DISCIPLE_DAMAGE);
        bus.publish('RAID_DAMAGE_DEALT', { amount: DISCIPLE_DAMAGE });
        runAnimation(el, 'disciple-strike');
        d._attackTimer = now + DISCIPLE_ATTACK_INTERVAL;
      }
    }
  });
}

export function tickBlobRaid(delta) {
  if (!activeRaid) return;
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
  bus.publish('RAID_DAMAGE_DEALT', { amount: dmg });
}

export function hasBlobs() {
  return blobs.length > 0;
}

export function raidFinished() {
  return spawnCount >= MAX_BLOBS && blobs.length === 0;
}

// Event bus wiring
bus.subscribe('BLOB_SPAWN', () => {
  spawnBlob();
});

bus.subscribe('DISCIPLE_ATTACK', ({ damage }) => {
  damageClosestBlob(damage);
});

bus.subscribe('TICK', ({ delta }) => {
  tickBlobRaid(delta);
});

// Track raid activity
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('raid-start', () => {
    activeRaid = true;
  });

  document.addEventListener('raid-end', () => {
    activeRaid = false;
  });
}
