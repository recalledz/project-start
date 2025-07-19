import addLog from '../log.js';
import { refreshMetamorphosis } from '../metamorphosis.js';
import { sectState, systems, currentEnemy } from './state.js';
import { generateDiscipleAttributes } from '../discipleAttributes.js';
import Disciple from '../disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { createOverlay } from '../ui/overlay.js';

export { addDiscoveredLocation } from "./ui.js";
export const discoveredLocations = [];
// Core state for the Constructs system. Orbs from the
// previous implementation remain intact.
// Water regeneration constants
// Water regen follows a saturating logistic curve that gradually
// approaches `R_MAX` with diminishing returns as Water accumulates.
const R_MAX = 6;        // cap per-second regen
const BASE_MIDPOINT = 1000;  // default inflection point
const K = 150;          // controls steepness of taper

function getWaterMidpoint() {
  return systems.voiceOfThePeople ? 1500 : BASE_MIDPOINT;
}

// Seasonal cycle configuration
// A full in-game day lasts 5 real minutes (300 seconds). Each season spans
// 28 of these days, so a complete season cycle takes 8,400 seconds.
export const DAY_LENGTH_SECONDS = 300;
export const SEASON_LENGTH_DAYS = 28;
const seasons = [
  { name: 'Verdantia', multiplier: 1.20 },
  { name: 'Solaria', multiplier: 1.35 },
  { name: 'Aurora', multiplier: 1.10 },
  { name: 'Aurelia', multiplier: 0.90 },
  { name: 'Bruma', multiplier: 0.70 }
];
const seasonClasses = ['spring','summer','aurora','autumn','winter'];
const seasonTemps = [15, 25, 20, 10, -5];

export const SECT_SCHEDULE = [
  { phase: 'Morning', duration: 60, action: 'Training' },
  { phase: 'Midday', duration: 60, action: 'Work' },
  { phase: 'Afternoon', duration: 60, action: 'Work' },
  { phase: 'Evening', duration: 60, action: 'Eat' },
  { phase: 'Night', duration: 60, action: 'Sleep' }
];

export const SEASON_COLORS = {
  Verdantia: ['rgba(80,160,80,0.9)', 'rgba(30,70,30,1.0)'],
  Solaria: ['rgba(200,120,40,0.9)', 'rgba(90,40,10,1.0)'],
  Aurora: ['rgba(150,130,80,0.9)', 'rgba(70,50,30,1.0)'],
  Aurelia: ['rgba(140,140,160,0.9)', 'rgba(60,60,80,1.0)'],
  Bruma: ['rgba(60,120,160,0.9)', 'rgba(30,60,80,1.0)']
};

export function setSeasonBackdrop(season) {
  const [start, end] = SEASON_COLORS[season];
  const root = document.documentElement;
  root.style.setProperty('--season-start', start);
  root.style.setProperty('--season-end', end);
}


export const sectSystem = {
  orbs: {
    water: { current: 0, max: 2000, regen: R_MAX }
  },
  resources: {
    thought: { current: 0, max: 10, regen: 0, unlocked: false },
    structure: { current: 0, max: 10, regen: 0, unlocked: false },
    woodEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    fireEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    earthEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    summerEssence: { current: 0, max: 10, regen: 0, unlocked: false },
    waterEssence: { current: 0, max: 10, regen: 0, unlocked: false }
  },
  gains: {
    water: 0
  },
  skills: {
    voice: { xp: 0, level: 0 },
    mind: { xp: 0, level: 0 },
    invocation: { xp: 0, level: 0 }
  },
  mindSlotAwarded: false,
  memorySlots: 2,
  seasonIndex: 0,
  seasonDay: 0,
  seasonTimer: 0,
  weather: null,
  waterRegenBase: 0,
  activeConstructs: [],
  savedConstructs: [],
  activeBuffs: {},
  cooldowns: {},
  constructUnlocked: true,
  pot: [],
  constructPotency: {},
  playerConstructXp: {},
  disciples: [],
  murmurCasts: 0,
  intonePresses: 0,
  intoneTimer: 0,
  intoneIdle: 0,
  mnemonicTimer: 0,
  mnemonicBeats: 0,
  mnemonicPotency: 1,
  murmurChain: 0,
  scheduleIndex: 0,
  scheduleTimer: 0
};

export function getCurrentSchedule() {
  return SECT_SCHEDULE[sectSystem.scheduleIndex];
}

// use the same object for the water resource and orb
sectSystem.resources.water = sectSystem.orbs.water;

// Basic construct recipe list. Additional constructs can be appended
// later through unlocks.
export const recipes = [
  {
    name: 'Murmur',
    // Increased cost to make early water management more meaningful
    input: { water: 25 },
    output: { sound: 1 },
    xp: { voice: 1 },
    tags: ['single-cast', 'generator'],
    unlocked: true,
    cooldown: 1,
    potency: 1,
    battle: { damage: 2 }
  },
  {
    name: 'Echo of Mind',
    input: { sound: 1, water: 1 },
    output: { thought: 1 },
    xp: { mind: 0.5, voice: 0.5 },
    tags: ['single-cast', 'generator', 'duration'],
    unlocked: false,
    requirements: { voiceLevel: 3, water: 1500 },
    castCost: { sound: 25, water: 500 },
    duration: 5,
    cooldown: 5,
    potency: 1,
    battle: { damage: 3 }
  },
  {
    name: 'Clarity Pulse',
    input: { thought: 1, water: 1 },
    output: {},
    xp: { mind: 1 },
    tags: ['single-cast', 'buff', 'duration'],
    unlocked: false,
    requirements: { mindLevel: 2, water: 1700 },
    castCost: { thought: 20, sound: 50 },
    duration: 30,
    cooldown: 30,
    potency: 1,
    battle: { damage: 4 }
  },
  {
    name: 'Symbol Seed',
    input: { sound: 1, thought: 1 },
    output: { structure: 1 },
    xp: {},
    tags: ['duration', 'generator', 'drain'],
    unlocked: false,
    requirements: { mindLevel: 3, water: 2000 },
    duration: 30,
    cooldown: 30,
    potency: 1,
    battle: { damage: 5 }
  },
  {
    name: 'Mental Construct',
    input: { sound: 1, thought: 1, water: 1 },
    output: {},
    xp: { invocation: 1 },
    tags: ['single-cast'],
    unlocked: false,
    requirements: { voiceLevel: 5, mindLevel: 5, water: 2300 },
    castCost: { thought: 10, structure: 10, water: 1000 },
    cooldown: 10,
    potency: 1,
    battle: { damage: 6 }
  },
  {
    name: 'Intone',
    input: {},
    output: {},
    xp: {},
    tags: ['buff'],
    unlocked: false,
    cooldown: 30,
    potency: 1
  },
  {
    name: 'Mnemonic Rhythm',
    input: {},
    output: {},
    xp: {},
    tags: ['buff'],
    unlocked: false,
    castCost: { sound: 50 },
    cooldown: 30,
    potency: 1
  },
  {
    name: 'The Calling',
    input: { sound: 100 },
    output: {},
    xp: 0,
    tags: ['voice'],
    unlocked: false,
    requirements: { sound: 100 },
    cooldown: 300
  },
  {
    name: 'Sonic Boom',
    input: {},
    output: {},
    xp: { voice: 10 },
    tags: ['single-cast', 'combat'],
    unlocked: false,
    castCost: { sound: 10 },
    cooldown: 10,
    potency: 1,
    borderGlow: 'metal',
    battle: { damage: 20 }
  }
];

// initialize potency for each construct
recipes.forEach(r => {
  sectSystem.constructPotency[r.name] = r.potency || 1.0;
});

const resourceIcons = {
  water: 'star',
  thought: 'activity',
  structure: 'box',
  woodEssence: 'leaf',
  fireEssence: 'flame',
  earthEssence: 'mountain',
  summerEssence: 'sun',
  waterEssence: 'droplet'
};


// Effect summary strings used across UI views
export const constructEffectText = {
  'Murmur': 'Generates 1 Sound (+1 Voice XP)',
  'Echo of Mind': 'Generates 1 Thought per second for 5s',
  'Clarity Pulse': 'Gain 1% Water per s',
  'Symbol Seed': 'Gain 0.1 Structure per thought drained',
  'Intone': 'Press repeatedly to charge; 1.2× at 5, 1.5× at 10, 2× at 15 for 30s',
  'Mnemonic Rhythm': 'Grants ×2 XP to other constructs for 3s; +0.2× per potency',
  'Mental Construct': 'Gain 0.1 elemental essence based on season',
  'The Calling': 'Attempts to recruit a Disciple based on Calling potency',
  'Sonic Boom': 'Deal 20 damage to the enemy'
};

export const constructColors = {
  'Murmur': '#b0b0b0', // Metallic Grey
  'Echo of Mind': '#8a2be2', // Violet
  'Clarity Pulse': '#87ceeb', // Sky Blue
  'Symbol Seed': '#8a2be2', // Violet
  'Intone': '#87ceeb', // Sky Blue
  'Mental Construct': '#ffbf00', // Amber
  'Mnemonic Rhythm': '#ffd700', // Gold
  'Sonic Boom': '#999999'
};

export const constructIcons = {
  'Murmur': 'volume-1',
  'Echo of Mind': 'brain',
  'Clarity Pulse': 'zap',
  'Symbol Seed': 'leaf',
  'Intone': 'mic',
  'Mental Construct': 'cpu',
  'Mnemonic Rhythm': 'music',
  'The Calling': 'bell',
  'Sonic Boom': 'volume-2'
};

function xpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}

function getSkillProgress(xp) {
  let total = 0;
  let level = 0;
  let next = xpRequired(level);
  while (xp >= total + next) {
    total += next;
    level += 1;
    next = xpRequired(level);
  }
  const progress = (xp - total) / next;
  return { level, progress, next };
}

function getIntoneMultiplier() {
  if (sectSystem.intoneTimer > 0) return 2.0;
  const p = sectSystem.intonePresses;
  if (p >= 15) return 2.0;
  if (p >= 10) return 1.5;
  if (p >= 5) return 1.2;
  return 1.0;
}



function getConstructLevel(caster = 'player', name) {
  const xp =
    caster === 'player'
      ? sectSystem.playerConstructXp[name] || 0
      : sectState.discipleConstructXp[caster]?.[name] || 0;
  return getSkillProgress(xp).level;
}

function awardXp(amount, tags) {
  if (!tags || tags.length === 0) return;
  const split = amount / tags.length;
  const prevSlots = sectSystem.memorySlots;
  tags.forEach(tag => {
    const skill = sectSystem.skills[tag];
      if (skill) {
        skill.xp += split;
        const progress = getSkillProgress(skill.xp);
        if (progress.level > skill.level) {
          skill.level = progress.level;
          if (tag === 'mind' && progress.level >= 1 && !sectSystem.mindSlotAwarded) {
            sectSystem.memorySlots += 1;
            sectSystem.mindSlotAwarded = true;
          }
        }
    }
  });
  if (sectSystem.memorySlots !== prevSlots) {
    renderConstructCards();
  }
  window.dispatchEvent(new CustomEvent('voice-xp-changed'));
}

function awardConstructXp(xpObj = {}, mult = 1) {
  Object.entries(xpObj).forEach(([tag, amt]) => {
    awardXp(amt * mult, [tag]);
  });
}

// Per-tick effects for active constructs. These are simplified
// implementations to demonstrate the new constructs in action.
const constructEffects = {
  Murmur(dt, pot = sectSystem.constructPotency['Murmur'] || 1) {
    const amount = dt * pot; // 1 water -> sound per second scaled
    const ins = sectSystem.resources.water;
    const snd = sectSystem.resources.sound;
    if (!snd) return;
    if (ins.current >= amount) {
      ins.current -= amount;
      snd.current = Math.min(snd.max, snd.current + amount);
    }
  },
  'Echo of Mind'(dt, pot = sectSystem.constructPotency['Echo of Mind'] || 1) {
    const ins = sectSystem.resources.water;
    const th = sectSystem.resources.thought;
    const amount = dt * pot;
    if (ins.current >= amount) {
      ins.current -= amount;
      th.current = Math.min(th.max, th.current + amount);
      th.unlocked = true;
    }
  },
  'Clarity Pulse'(dt, pot = sectSystem.constructPotency['Clarity Pulse'] || 1) {
    const bonus = 0.01 * dt * pot;
    sectSystem.resources.water.current = Math.min(
      sectSystem.resources.water.max,
      sectSystem.resources.water.current + bonus
    );
  },
  'Symbol Seed'(dt, pot = sectSystem.constructPotency['Symbol Seed'] || 1) {
    const th = sectSystem.resources.thought;
    const str = sectSystem.resources.structure;
    const drain = dt * 1;
    if (th.current >= drain) {
      th.current -= drain;
      str.current = Math.min(str.max, str.current + drain * 0.1 * pot);
      str.unlocked = true;
      awardConstructXp({ mind: dt });
    }
  },
  'Mental Construct'(dt, pot = 1) {
    const gain = 0.1 * pot;
    const season = seasons[sectSystem.seasonIndex].name;
    let key = '';
    if (season === 'Verdantia') key = 'woodEssence';
    else if (season === 'Solaria') key = 'fireEssence';
    else if (season === 'Aurora') key = 'earthEssence';
    else if (season === 'Aurelia') key = 'summerEssence';
    else key = 'waterEssence';
    const res = sectSystem.resources[key];
    if (res) {
      res.current = Math.min(res.max, res.current + gain);
      res.unlocked = true;
    }
  },
    Intone() {
    if (sectSystem.intoneTimer > 0) return;
    if (sectSystem.intonePresses < 15) {
      sectSystem.intonePresses += 1;
    }
    sectSystem.intoneIdle = 0;
    if (sectSystem.intonePresses >= 15) {
      sectSystem.intoneTimer = 30;
      const rec = recipes.find(r => r.name === 'Intone');
      if (rec && rec.cooldown) sectSystem.cooldowns['Intone'] = rec.cooldown;
    }
  },
  'Mnemonic Rhythm'(dt, pot = 1) {
    sectSystem.mnemonicTimer = 3;
    sectSystem.mnemonicBeats = 0;
    sectSystem.mnemonicPotency = pot;
  },
  'The Calling'(dt, pot = sectSystem.constructPotency['The Calling'] || 1) {
    const callPower = pot;
    const targetIdx = sectSystem.disciples.length + 1;
    const reqPower = Math.pow(1.8, targetIdx - 1);
    const chance = Math.max(0.05, Math.min(1, callPower / reqPower));
    if (sectSystem.disciples.length >= sectState.maxDisciples) {
      addLog('No available housing for more disciples.', 'info');
      if (lastConstructTarget) showConstructCloud('Failed', lastConstructTarget, 'red');
    } else if (Math.random() < chance) {
      const bonus = generateDiscipleAttributes();
      const attrs = {
        strength: 1 + bonus.strength,
        dexterity: 1 + bonus.dexterity,
        endurance: 1 + bonus.endurance,
        intelligence: 1 + bonus.intelligence,
        charisma: 1 + bonus.charisma,
        potential: bonus.potential
      };
      const newDisc = new Disciple({ id: targetIdx, name: `Disciple ${targetIdx}`, attributes: attrs });
      initializeDisciple(newDisc);
      sectSystem.disciples.push(newDisc);
      sectState.discipleConstructXp[targetIdx] = {};
      addLog('A new Disciple has answered your call!', 'info');
      if (lastConstructTarget) showConstructCloud('+1', lastConstructTarget);
      document.dispatchEvent(
        new CustomEvent('disciple-gained', { detail: { count: sectSystem.disciples.length } })
      );
    } else {
      addLog('Your call went unanswered.', 'info');
      if (lastConstructTarget) showConstructCloud('Failed', lastConstructTarget, 'red');
    }
  }
};

let container;
let panel;
let selectedChanter = null;
let lastConstructTarget = null;

export function initSect() {
  container = document.getElementById('constructTabCardContainer');
  if (!container) return;
  container.innerHTML = `
    <div id="constructToggle" class="construct-toggle">❮</div>
    <div id="constructHotbar" class="construct-hotbar"></div>
    <div id="modalConstructorPanel" class="modal-constructor-panel">
      <div class="construct-header">
        <span class="construct-title">Modal Panel Constructor</span>
        <button id="closeConstructBtn" class="cast-button">❌</button>
      </div>
      <div class="construct-tab constructor-view">
        <div class="constructor-container">
          <div id="constructPot" class="construct-pot">⚗️</div>
          <div id="resourceButtons" class="resource-buttons"></div>
          <button id="performConstruct" class="cast-button construct-button">Construct</button>
          <div id="constructRequirements" class="construct-requirements"></div>
        </div>
        <div class="modal-card-container">
          <div class="slots-and-disciples">
            <div id="memorySlotsDisplay" class="memory-slots"></div>
            <div id="constructDisciples" class="construct-disciples"></div>
          </div>
          <div id="modalCardContainer" class="built-constructs"></div>
          <div id="constructStats" class="construct-stats"></div>
        </div>
      </div>
    </div>
  `;
  panel = container.querySelector('#modalConstructorPanel');
  const toggleBtn = container.querySelector('#constructToggle');
  toggleBtn.addEventListener('click', togglePanel);
  toggleBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle constructor panel', e.pageX + 10, e.pageY + 10);
  });
  toggleBtn.addEventListener('mouseleave', window.hideTooltip);
  panel.querySelector('#closeConstructBtn').addEventListener('click', togglePanel);
  panel.querySelector('#performConstruct').addEventListener('click', performConstruct);
  renderResourcesUI();
  renderPot();
  renderXpBar();
  renderOrbs();
  renderConstructCards();
  renderChantDisciples();
  renderHotbar();
  renderSeasonBanner();
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  document.addEventListener('disciple-gained', renderChantDisciples);
}

function togglePanel() {
  if (!panel) return;
  const open = panel.classList.contains('open');
  if (open) {
    panel.classList.remove('open');
    panel.classList.add('close-right');
  } else {
    panel.classList.remove('close-right');
    panel.classList.add('open');
    renderResourcesUI();
  }
  const toggle = container.querySelector('#constructToggle');
  if (toggle) toggle.textContent = open ? '❮' : '❯';
}

function addResourceToPot(name) {
  if (sectSystem.pot.includes(name)) return;
  if (sectSystem.pot.length >= 3) return;
  sectSystem.pot.push(name);
  renderPot();
}

function renderPot() {
  const pot = container.querySelector('#constructPot');
  if (!pot) return;
  if (sectSystem.pot.length) {
    pot.innerHTML = sectSystem.pot
      .map(r => `<i data-lucide="${resourceIcons[r] || 'package'}"></i>`)
      .join(' ');
    if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  } else {
    pot.textContent = '⚗️';
  }
  updateConstructButtonValidity();
  renderConstructRequirements();
}

function updateConstructButtonValidity() {
  const btn = panel.querySelector('#performConstruct');
  if (!btn) return;
  const unique = new Set(sectSystem.pot);
  const valid = sectSystem.pot.length > 0 &&
                sectSystem.pot.length <= 3 &&
                unique.size === sectSystem.pot.length;
  btn.classList.toggle('invalid', !valid);
}

function renderConstructRequirements() {
  const reqEl = panel.querySelector('#constructRequirements');
  if (!reqEl) return;
  reqEl.textContent = '';
  reqEl.style.display = 'none';
  const counts = {};
  sectSystem.pot.forEach(r => {
    counts[r] = (counts[r] || 0) + 1;
  });
  const recipe = recipes.find(r => Object.entries(r.input).every(([k,v]) => counts[k] >= v));
  if (!recipe || !recipe.requirements) return;
  const reqs = [];
  if (recipe.requirements.voiceLevel) {
    reqs.push(`Voice Lv.${recipe.requirements.voiceLevel}`);
  }
  if (recipe.requirements.mindLevel) {
    reqs.push(`Mind Lv.${recipe.requirements.mindLevel}`);
  }
  if (recipe.requirements.water) {
    reqs.push(`${recipe.requirements.water} Water`);
  }
  reqEl.textContent = `Requires: ${reqs.join(' & ')}`;
  reqEl.style.display = 'block';
}

function renderResourcesUI() {
  const cont = container.querySelector('#resourceButtons');
  if (!cont) return;
  cont.innerHTML = '';
  Object.entries(sectSystem.resources).forEach(([name, res]) => {
    if (res.unlocked === false) return;
    const btn = document.createElement('button');
    btn.className = 'cast-button';
    btn.textContent = `${name} (${Math.floor(res.current)})`;
    btn.addEventListener('click', () => addResourceToPot(name));
    cont.appendChild(btn);
  });
}

function performConstruct() {
  if (!sectSystem.pot.length) return;
  const counts = {};
  sectSystem.pot.forEach(r => {
    counts[r] = (counts[r] || 0) + 1;
  });
  const recipe = recipes.find(r => r.unlocked && Object.entries(r.input).every(([k,v]) => counts[k] >= v));
  sectSystem.pot = [];
  renderPot();
  renderConstructRequirements();
  if (!recipe) return;
  if (recipe.requirements) {
    if (recipe.requirements.voiceLevel && sectSystem.skills.voice.level < recipe.requirements.voiceLevel) {
      addLog(`Requires Voice Lv.${recipe.requirements.voiceLevel}`, 'error');
      return;
    }
    if (recipe.requirements.mindLevel && sectSystem.skills.mind.level < recipe.requirements.mindLevel) {
      addLog(`Requires Mind Lv.${recipe.requirements.mindLevel}`, 'error');
      return;
    }
    if (recipe.requirements.water && sectSystem.resources.water.current < recipe.requirements.water) {
      addLog(`Requires ${recipe.requirements.water} Water`, 'error');
      return;
    }
  }
  for (const [res, amt] of Object.entries(recipe.input)) {
    if (!sectSystem.resources[res] || sectSystem.resources[res].current < amt) return;
  }
  for (const [res, amt] of Object.entries(recipe.input)) {
    sectSystem.resources[res].current -= amt;
  }
  for (const [res, amt] of Object.entries(recipe.output)) {
    const r = sectSystem.resources[res];
    if (r) r.current = Math.min(r.max, r.current + amt);
  }
  awardConstructXp(recipe.xp);
  addConstruct(recipe.name);
  renderResourcesUI();
  renderXpBar();
  addLog(`${recipe.name} constructed!`, 'info');
}

function addConstruct(name) {
  if (!sectSystem.savedConstructs.includes(name)) {
    sectSystem.savedConstructs.push(name);
    const def = recipes.find(r => r.name === name);
    if (
      def &&
      def.tags &&
      def.tags.includes('buff') &&
      sectSystem.activeConstructs.length < sectSystem.memorySlots
    ) {
      sectSystem.activeConstructs.push(name);
    }
  }
  if (panel && container) {
    renderConstructCards();
    renderHotbar();
  }
}

export function unlockConstruct(name) {
  const rec = recipes.find(r => r.name === name);
  if (rec && !rec.unlocked) {
    rec.unlocked = true;
    delete rec.requirements;
    addConstruct(name);
  }
}

export function renderConstructCards() {
  if (!panel) return;
  const cont = panel.querySelector('#modalCardContainer');
  const slotCont = panel.querySelector('#memorySlotsDisplay');
  if (!cont || !slotCont) return;
  cont.innerHTML = '';
  slotCont.innerHTML = '';
  for (let i = 0; i < sectSystem.memorySlots; i++) {
    const ms = document.createElement('div');
    ms.className = 'memory-slot';
    if (i < sectSystem.activeConstructs.length) ms.classList.add('filled');
    slotCont.appendChild(ms);
  }
  sectSystem.savedConstructs.forEach(c => {
    const wrapper = document.createElement('div');
    wrapper.className = 'construct-card-wrapper';
    wrapper.dataset.name = c;
    const card = createConstructCard(c);
    if (sectSystem.activeConstructs.includes(c)) card.classList.add('active');
    card.addEventListener('click', () => {
      toggleConstructActive(c);
      showConstructStats(c);
    });
    wrapper.appendChild(card);
    const timer = document.createElement('div');
    timer.className = 'cooldown-timer';
    wrapper.appendChild(timer);
    const assignedId = Object.entries(sectState.chantAssignments).find(([, n]) => n === c)?.[0];
    const assign = document.createElement('div');
    assign.className = 'construct-assignment';
    if (assignedId) {
      const disc = sectSystem.disciples.find(x => x.id == assignedId);
      assign.textContent = `Chanter: ${disc ? disc.name : assignedId}`;
    } else {
      assign.textContent = 'Assign';
    }
    assign.addEventListener('click', () => {
      if (selectedChanter !== null) {
        Object.keys(sectState.chantAssignments).forEach(k => {
          if (k == selectedChanter) delete sectState.chantAssignments[k];
        });
        sectState.chantAssignments[selectedChanter] = c;
        selectedChanter = null;
        renderChantDisciples();
        renderConstructCards();
      } else if (assignedId) {
        delete sectState.chantAssignments[assignedId];
        renderChantDisciples();
        renderConstructCards();
      }
    });
    wrapper.appendChild(assign);
    cont.appendChild(wrapper);
  });
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  if (sectSystem.savedConstructs.length > 0) {
    showConstructStats(sectSystem.savedConstructs[0]);
  }
  renderChantDisciples();
}

export function createConstructCard(name) {
  const card = document.createElement('div');
  card.className = 'construct-card';
  card.dataset.name = name;
  const color = constructColors[name];
  if (color) card.style.setProperty('--element-color', color);
  const icon = document.createElement('div');
  icon.className = 'construct-icon';
  icon.innerHTML = `<i data-lucide="${constructIcons[name] || 'package'}"></i>`;
  card.appendChild(icon);
  const title = document.createElement('div');
  title.className = 'construct-name';
  title.textContent = name;
  card.appendChild(title);
  const recipe = recipes.find(r => r.name === name);
  if (recipe) {
    if (name === 'Intone') {
      const meter = document.createElement('div');
      meter.className = 'intone-meter';
      for (let i = 0; i < 15; i++) {
        const seg = document.createElement('div');
        seg.className = 'intone-seg';
        if (i === 4 || i === 9) seg.classList.add('marker');
        meter.appendChild(seg);
      }
      card.appendChild(meter);
      const timer = document.createElement('div');
      timer.className = 'intone-timer';
      card.appendChild(timer);
    } else if (name === 'Mnemonic Rhythm') {
      const beats = document.createElement('div');
      beats.className = 'mnemonic-beats';
      card.appendChild(beats);
      const bar = document.createElement('div');
      bar.className = 'mnemonic-bar';
      const fill = document.createElement('div');
      fill.className = 'mnemonic-bar-fill';
      bar.appendChild(fill);
      card.appendChild(bar);
    }
    if (recipe.cooldown) {
      const bar = document.createElement('div');
      bar.className = 'cooldown-bar';
      const fill = document.createElement('div');
      fill.className = 'cooldown-bar-fill';
      bar.appendChild(fill);
      card.appendChild(bar);
    }
  } else {
    card.textContent = name;
  }
  return card;
}

function renderChantDisciples() {
  const cont = panel.querySelector('#constructDisciples');
  if (!cont) return;
  cont.innerHTML = '';
  const chanters = sectSystem.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Chant'
  );
  const available = chanters.filter(d => !sectState.chantAssignments[d.id]);
  const header = document.createElement('div');
  header.className = 'chant-header';
  header.textContent = `Chanters ${available.length}/${chanters.length}`;
  cont.appendChild(header);
  const list = document.createElement('div');
  list.className = 'chant-orbs';
  available.forEach(d => {
    const div = document.createElement('div');
    div.className = 'chant-disciple';
    div.textContent = d.id;
    if (selectedChanter === d.id) div.classList.add('selected');
    div.addEventListener('click', () => {
      selectedChanter = selectedChanter === d.id ? null : d.id;
      renderChantDisciples();
    });
    list.appendChild(div);
  });
  cont.appendChild(list);
}

export function createConstructInfo(name) {
  const recipe = recipes.find(r => r.name === name);
  if (!recipe) return null;
  const info = document.createElement('div');
  info.className = 'construct-info';
  const cc = recipe.castCost || recipe.input || {};
  const costHtml = Object.entries(cc)
    .map(([res, amt]) => `${amt} <i data-lucide="${resourceIcons[res] || 'package'}"></i>`)
    .join(' ');
  const cd = recipe.cooldown || 0;
  const pot = (sectSystem.constructPotency[name] || 1).toFixed(2);
  const eff = getConstructEffect(name) || '';
  info.innerHTML = `<div class="stat-line"><span class="stat-cost">Cost: ${costHtml || '—'}</span> <span class="stat-cd">CD: ${cd} s</span> <span class="stat-potency">Potency: ${pot}</span></div><div class="stat-line">Effect: ${eff}</div>`;
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  return info;
}

export function getConstructEffect(name) {
  if (constructEffectText[name]) return constructEffectText[name];
  const recipe = recipes.find(r => r.name === name);
  if (!recipe) return null;
  if (!Object.keys(recipe.output).length) return null;
  return Object.entries(recipe.output)
    .map(([k, v]) => `+${v} ${k}`)
    .join(', ');
}

function showConstructStats(name) {
  const statsEl = panel.querySelector('#constructStats');
  if (!statsEl) return;
  const recipe = recipes.find(r => r.name === name);
  if (!recipe) {
    statsEl.textContent = '';
    return;
  }
  const cc = recipe.castCost || recipe.input || {};
  const costHtml = Object.entries(cc)
    .map(([res, amt]) => `${amt} <i data-lucide="${resourceIcons[res] || 'package'}"></i>`)
    .join(' ');
  const cd = recipe.cooldown || 0;
  const pot = (sectSystem.constructPotency[name] || 1).toFixed(2);
  const eff = getConstructEffect(name) || '';
  statsEl.innerHTML = `<div class="stat-line"><span class="stat-cost">Cost: ${costHtml || '—'}</span> <span class="stat-cd">CD: ${cd} s</span> <span class="stat-potency">Potency: ${pot}</span></div><div class="stat-line">Effect: ${eff}</div>`;
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
}

function toggleConstructActive(name) {
  const idx = sectSystem.activeConstructs.indexOf(name);
  if (idx >= 0) {
    sectSystem.activeConstructs.splice(idx, 1);
  } else if (sectSystem.activeConstructs.length < sectSystem.memorySlots) {
    sectSystem.activeConstructs.push(name);
  }
  const slotCont = panel.querySelector('#memorySlotsDisplay');
  if (slotCont) {
    [...slotCont.children].forEach((slot, i) => {
      slot.classList.toggle('filled', i < sectSystem.activeConstructs.length);
    });
  }
  const cardEl = panel.querySelector(`.construct-card[data-name="${name}"]`);
  if (cardEl) {
    const active = sectSystem.activeConstructs.includes(name);
    cardEl.classList.toggle('active', active);
  }
  renderHotbar();
}

export function castConstruct(name, el, powerMult = 1, caster = 'player') {
  const def = recipes.find(r => r.name === name);
  if (!def) return;
  if (currentEnemy && (!def.tags || !def.tags.includes('combat'))) {
    addLog('Cannot use this construct in combat', 'error');
    return;
  }
  const voiceSkill = sectSystem.skills.voice;
  const mindSkill = sectSystem.skills.mind;
  if (def.requirements && def.requirements.voiceLevel && voiceSkill.level < def.requirements.voiceLevel) {
    addLog(`Requires Voice Lv.${def.requirements.voiceLevel}`, 'error');
    return;
  }
  if (def.requirements && def.requirements.mindLevel && mindSkill.level < def.requirements.mindLevel) {
    addLog(`Requires Mind Lv.${def.requirements.mindLevel}`, 'error');
    return;
  }
  if (def.requirements && def.requirements.water && sectSystem.resources.water.current < def.requirements.water) {
    addLog(`Requires ${def.requirements.water} Water`, 'error');
    return;
  }
  const cdKey = caster === 'player' ? name : `${name}:${caster}`;
  if (sectSystem.cooldowns[cdKey] > 0) return;
  const cost = def.castCost || def.input;
  for (const [res, amt] of Object.entries(cost)) {
    const r = sectSystem.resources[res];
    if (!r || r.current < amt) return;
  }
  for (const [res, amt] of Object.entries(cost)) {
    sectSystem.resources[res].current -= amt;
  }
  for (const [res, amt] of Object.entries(def.output)) {
    const r = sectSystem.resources[res];
    if (r) r.current = Math.min(r.max, r.current + amt);
  }
  if (name === 'Murmur') {
    sectSystem.murmurCasts += 1;
    sectSystem.murmurChain += 1;
    const intone = recipes.find(r => r.name === 'Intone');
    if (intone && !intone.unlocked && sectSystem.murmurCasts >= 10) {
      intone.unlocked = true;
      addLog('Intone construct unlocked!', 'info');
      addConstruct('Intone');
    }
  } else {
    sectSystem.murmurChain = 0;
  }
  const mnemonic = recipes.find(r => r.name === 'Mnemonic Rhythm');
  if (mnemonic && !mnemonic.unlocked && sectSystem.murmurChain >= 3) {
    mnemonic.unlocked = true;
    addLog('Mnemonic Rhythm construct unlocked!', 'info');
    addConstruct('Mnemonic Rhythm');
  }
  let xpMult = 1;
  if (sectSystem.mnemonicTimer > 0 && name !== 'Mnemonic Rhythm') {
    xpMult = 2 + 0.2 * (sectSystem.mnemonicPotency - 1);
    sectSystem.mnemonicBeats += 1;
  }
  awardConstructXp(def.xp, xpMult);
  lastConstructTarget = el;
  showConstructCloud(name, el);
  const basePot = sectSystem.constructPotency[name] || 1;
  const levelPot = Math.pow(1.05, getConstructLevel(caster, name));
  let voiceMult = 1;
  if (caster === 'player' && def.tags && def.tags.includes('generator')) {
    voiceMult = Math.pow(1.05, sectSystem.skills.voice.level);
  }
  const finalMult = powerMult * basePot * levelPot * voiceMult;
  if (def.duration) {
    sectSystem.activeBuffs[name] = { time: def.duration, mult: finalMult };
  } else {
    const effect = constructEffects[name];
    if (effect) effect(1, finalMult);
  }
  lastConstructTarget = null;
  if (def.battle && def.battle.damage && currentEnemy) {
    currentEnemy.takeDamage(def.battle.damage * finalMult);
  }
  if (def.cooldown && name !== 'Intone') {
    sectSystem.cooldowns[cdKey] = def.cooldown;
  }
  renderResources();
  renderXpBar();
  renderOrbs();
}

export function renderHotbar() {
  const bars = [];
  if (container) {
    const b = container.querySelector('#constructHotbar');
    if (b) bars.push(b);
  }
  const combatBar = document.getElementById('combatHotbar');
  if (combatBar) bars.push(combatBar);
  bars.forEach(bar => {
    bar.innerHTML = '';
    const combatOnly = bar.id === 'combatHotbar';
    sectSystem.activeConstructs.forEach(c => {
      const recipe = recipes.find(r => r.name === c);
      if (combatOnly && (!recipe || !recipe.tags || !recipe.tags.includes('combat'))) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'construct-card-wrapper';
      const card = createConstructCard(c);
      card.classList.add('hotbar-construct');
      card.addEventListener('click', () => castConstruct(c, card));
      wrapper.appendChild(card);
      const info = createConstructInfo(c);
      if (info) wrapper.appendChild(info);
      bar.appendChild(wrapper);
    });
  });
}

export function renderXpBar() {
  const barFill = document.querySelector('#voiceSkillPanel .voice-xp-fill');
  const lvlEl = document.getElementById('voiceLevel');
  const detailEl = document.getElementById('voiceDetail');
  if (!barFill || !lvlEl) return;
  const skill = sectSystem.skills.voice;
  const prog = getSkillProgress(skill.xp);
  skill.level = prog.level;
  barFill.style.width = `${(prog.progress * 100).toFixed(1)}%`;
  lvlEl.textContent = `Voice Lv.${prog.level}`;
  if (detailEl) {
    const bonus = (Math.pow(1.05, skill.level) - 1) * 100;
    const xpToNext = Math.ceil((1 - prog.progress) * prog.next);
    detailEl.textContent = `Bonus: +${bonus.toFixed(0)}% generator potency | ${xpToNext} XP to Lv.${skill.level + 1}`;
  }
}

function renderOrbs() {
  const fill = document.querySelector('#sectOrbs .sect-orb.water .orb-fill');
  if (fill) {
    const pct = Math.max(0, Math.min(1, sectSystem.orbs.water.current / sectSystem.orbs.water.max)) * 100;
    fill.style.height = `${pct}%`;
  }
  window.dispatchEvent(new CustomEvent('orbs-changed'));
}

function renderSeasonBanner() {
  const banner = document.getElementById('seasonBanner');
  if (!banner) return;
  const idx = sectSystem.seasonIndex;
  const season = seasons[idx];
  setSeasonBackdrop(season.name);
  const day = sectSystem.seasonDay + 1;
  const daysLeft = SEASON_LENGTH_DAYS - day;
  const temp = seasonTemps[idx];
  banner.textContent = `${season.name} Day ${day} (${daysLeft}d) ${temp}°C`;
  banner.className = `season-banner ${seasonClasses[idx]}`;
  if (container) {
    seasonClasses.forEach(cls => container.classList.remove(cls));
    container.classList.add(seasonClasses[idx]);
    if (season.name === 'Verdantia') {
      container.classList.add('verdantia-bg');
    } else {
      container.classList.remove('verdantia-bg');
    }
  }
  if (sectSystem.weather) {
    banner.innerHTML = `${season.name} Day ${day} (${daysLeft}d) ${temp}°C<span class="weather-icon">${sectSystem.weather.icon}</span>`;
  }
}

function renderResources() {
  const panels = [
    document.getElementById('secondaryResources'),
    document.getElementById('combatResources')
  ];
  panels.forEach(panelRes => {
    if (!panelRes) return;
    panelRes.innerHTML = '';
    Object.entries(sectSystem.resources).forEach(([key, res]) => {
      if (key === 'water' || res.unlocked === false) return;
      const box = document.createElement('div');
      box.className = 'resource-box';
      const header = document.createElement('div');
      header.className = 'resource-text';
      const icon = document.createElement('i');
      icon.dataset.lucide = resourceIcons[key] || 'package';
      const name = document.createElement('span');
      name.className = 'resource-name';
      name.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      const value = document.createElement('span');
      value.className = `resource-value ${key}`;
      value.textContent = `${Math.floor(res.current)}/${res.max}`;
      header.appendChild(icon);
      header.appendChild(name);
      header.appendChild(value);
      const bar = document.createElement('div');
      bar.className = 'resource-bar';
      const fill = document.createElement('div');
      fill.className = `resource-fill ${key}`;
      fill.style.width = `${(res.current / res.max) * 100}%`;
      bar.appendChild(fill);
      box.appendChild(header);
      box.appendChild(bar);
      panelRes.appendChild(box);
    });
  });
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  window.dispatchEvent(new CustomEvent('resources-changed'));
}


function tickActiveConstructs(dt) {
  // Constructs no longer auto-cast when slotted. Only active buffs
  // from previously cast constructs are processed each tick.
  for (const name of Object.keys(sectSystem.activeBuffs)) {
    const data = sectSystem.activeBuffs[name];
    const effect = constructEffects[name];
    if (effect) effect(dt, data.mult || 1);
    data.time -= dt;
    if (data.time <= 0) delete sectSystem.activeBuffs[name];
  }
  for (const name of Object.keys(sectSystem.cooldowns)) {
    sectSystem.cooldowns[name] = Math.max(0, sectSystem.cooldowns[name] - dt);
    if (sectSystem.cooldowns[name] === 0) delete sectSystem.cooldowns[name];
  }
}

function updateCooldownOverlays() {
  if (!container) return;
  const cards = container.querySelectorAll('.construct-card[data-name]');
  cards.forEach(card => {
    const name = card.dataset.name;
    const def = recipes.find(r => r.name === name);
    if (!def) return;
    const remaining = def.cooldown ? (sectSystem.cooldowns[name] || 0) : 0;
    const ratio = def.cooldown ? 1 - remaining / def.cooldown : 1;
    const fill = card.querySelector('.cooldown-bar-fill');
    if (fill) fill.style.width = `${ratio * 100}%`;
    const cost = def.castCost || def.input || {};
    const affordable = Object.entries(cost).every(([res, amt]) => {
      const r = sectSystem.resources[res];
      return r && r.current >= amt;
    });
    const ready = remaining === 0 && affordable;
    card.classList.toggle('onCooldown', remaining > 0);
    card.classList.toggle('available', ready);
    card.classList.toggle('unavailable', !ready);
    const timer = card.parentElement.querySelector('.cooldown-timer');
    if (timer) timer.textContent = remaining > 0 ? `${remaining.toFixed(1)}s` : '';
  });
}

function updateIntoneUI() {
  if (!container) return;
  const card = container.querySelector('.construct-card[data-name="Intone"]');
  if (card) {
    const meter = card.querySelectorAll('.intone-seg');
    meter.forEach((seg, idx) => {
      const filled = sectSystem.intoneTimer > 0 || sectSystem.intonePresses > idx;
      seg.classList.toggle('filled', filled);
    });
    const timer = card.querySelector('.intone-timer');
    if (timer) {
      if (sectSystem.intoneTimer > 0) {
        timer.style.display = 'flex';
        timer.textContent = `${Math.ceil(sectSystem.intoneTimer)}s`;
      } else {
        timer.style.display = 'none';
      }
    }
  }
  const badge = container.querySelector('#intoneMultiplier');
  if (badge) {
    const mult = getIntoneMultiplier();
    badge.textContent = mult > 1 ? `×${mult.toFixed(1)}` : '';
  }
}

function updateMnemonicUI() {
  if (!container) return;
  const card = container.querySelector('.construct-card[data-name="Mnemonic Rhythm"]');
  if (!card) return;
  const fill = card.querySelector('.mnemonic-bar-fill');
  if (fill) {
    const ratio = Math.max(0, Math.min(1, sectSystem.mnemonicTimer / 3));
    fill.style.width = `${ratio * 100}%`;
  }
  const beats = card.querySelector('.mnemonic-beats');
  if (beats) {
    beats.textContent = sectSystem.mnemonicTimer > 0 ? sectSystem.mnemonicBeats : '';
  }
  card.classList.toggle('mnemonic-active', sectSystem.mnemonicTimer > 0);
}

export function tickSectSystem(delta) {
  const hasUI = !!container;
  const dt = delta / 1000;
  if (sectSystem.intoneTimer > 0) {
    sectSystem.intoneTimer = Math.max(0, sectSystem.intoneTimer - dt);
    if (sectSystem.intoneTimer === 0) {
      sectSystem.intonePresses = 0;
    }
  } else {
    sectSystem.intoneIdle += dt;
    if (sectSystem.intonePresses < 15 && sectSystem.intoneIdle >= 2) {
      const dec = Math.floor(sectSystem.intoneIdle / 2);
      sectSystem.intonePresses = Math.max(0, sectSystem.intonePresses - dec);
      sectSystem.intoneIdle -= dec * 2;
    }
  }
  if (sectSystem.mnemonicTimer > 0) {
    sectSystem.mnemonicTimer = Math.max(0, sectSystem.mnemonicTimer - dt);
    if (sectSystem.mnemonicTimer === 0) {
      sectSystem.mnemonicBeats = 0;
    }
  }
  sectSystem.scheduleTimer += dt;
  if (
    sectSystem.scheduleTimer >= SECT_SCHEDULE[sectSystem.scheduleIndex].duration
  ) {
    sectSystem.scheduleTimer -=
      SECT_SCHEDULE[sectSystem.scheduleIndex].duration;
    sectSystem.scheduleIndex =
      (sectSystem.scheduleIndex + 1) % SECT_SCHEDULE.length;
    document.dispatchEvent(
      new CustomEvent('schedule-phase', { detail: getCurrentSchedule() })
    );
  }
  sectSystem.seasonTimer += dt;
  if (sectSystem.seasonTimer >= DAY_LENGTH_SECONDS) {
    sectSystem.seasonTimer -= DAY_LENGTH_SECONDS;
    sectSystem.scheduleIndex = 0;
    sectSystem.scheduleTimer = 0;
    document.dispatchEvent(
      new CustomEvent('schedule-phase', { detail: getCurrentSchedule() })
    );
    sectSystem.seasonDay += 1;
    document.dispatchEvent(new CustomEvent('day-passed', {
      detail: { day: sectSystem.seasonDay, season: sectSystem.seasonIndex }
    }));
    if (!sectSystem.weather && Math.random() < 0.01) {
      const type = Math.random() < 0.5 ? 'clear' : 'torment';
      const duration = 180 + Math.floor(Math.random() * 121); // 3-5 minutes
      sectSystem.weather = {
        type,
        multiplier: type === 'clear' ? 1.25 : 0.5,
        icon: type === 'clear' ? '\u2728' : '\uD83D\uDE2D',
        duration
      };
      addLog(type === 'clear' ? 'Clear minded day!' : 'Torment sets in!', 'info');
    }
    if (sectSystem.seasonDay >= SEASON_LENGTH_DAYS) {
      sectSystem.seasonDay = 0;
      sectSystem.seasonIndex = (sectSystem.seasonIndex + 1) % seasons.length;
    }
  }
  if (sectSystem.weather) {
    sectSystem.weather.duration -= dt;
    if (sectSystem.weather.duration <= 0) sectSystem.weather = null;
  }
  const ins = sectSystem.resources.water;
  const seasonMult = seasons[sectSystem.seasonIndex].multiplier;
  const baseRateRaw = R_MAX / (1 + Math.exp((ins.current - getWaterMidpoint()) / K));
  const idleCount = 0;
  const idleMult = 1 + idleCount * 0.05;
  const baseTotal = baseRateRaw * 0.2 * idleMult;
  let regen = baseTotal * seasonMult;
  if (sectSystem.weather) regen *= sectSystem.weather.multiplier;
  regen = Math.min(R_MAX, regen) * getIntoneMultiplier();
  sectSystem.waterRegenBase = baseTotal;
  ins.current = Math.min(ins.max, ins.current + regen * dt);
  const echo = recipes.find(r => r.name === 'Echo of Mind');
  if (
    echo &&
    !echo.unlocked &&
    sectSystem.skills.voice.level >= 3 &&
    ins.current >= 1500
  ) {
    echo.unlocked = true;
    delete echo.requirements;
    addLog('Echo of Mind construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Echo of Mind');
    } else if (!sectSystem.savedConstructs.includes('Echo of Mind')) {
      sectSystem.savedConstructs.push('Echo of Mind');
    }
  }
  const pulse = recipes.find(r => r.name === 'Clarity Pulse');
  if (
    pulse &&
    !pulse.unlocked &&
    sectSystem.skills.mind.level >= 2 &&
    ins.current >= 1700
  ) {
    pulse.unlocked = true;
    delete pulse.requirements;
    addLog('Clarity Pulse construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Clarity Pulse');
    } else if (!sectSystem.savedConstructs.includes('Clarity Pulse')) {
      sectSystem.savedConstructs.push('Clarity Pulse');
    }
  }
  const seed = recipes.find(r => r.name === 'Symbol Seed');
  if (
    seed &&
    !seed.unlocked &&
    sectSystem.skills.mind.level >= 3 &&
    ins.current >= 2000
  ) {
    seed.unlocked = true;
    delete seed.requirements;
    addLog('Symbol Seed construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Symbol Seed');
    } else if (!sectSystem.savedConstructs.includes('Symbol Seed')) {
      sectSystem.savedConstructs.push('Symbol Seed');
    }
  }
  const mental = recipes.find(r => r.name === 'Mental Construct');
  if (
    mental &&
    !mental.unlocked &&
    sectSystem.skills.voice.level >= 5 &&
    sectSystem.skills.mind.level >= 5 &&
    ins.current >= 2300
  ) {
    mental.unlocked = true;
    delete mental.requirements;
    addLog('Mental Construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('Mental Construct');
    } else if (!sectSystem.savedConstructs.includes('Mental Construct')) {
      sectSystem.savedConstructs.push('Mental Construct');
    }
  }
  const call = recipes.find(r => r.name === 'The Calling');
  if (call && !call.unlocked && sectSystem.resources.sound && sectSystem.resources.sound.current >= 100) {
    call.unlocked = true;
    addLog('The Calling construct unlocked!', 'info');
    if (hasUI) {
      addConstruct('The Calling');
    } else if (!sectSystem.savedConstructs.includes('The Calling')) {
      sectSystem.savedConstructs.push('The Calling');
    }
  }
  tickActiveConstructs(dt);
  ins.current = Math.min(ins.max, Math.max(0, ins.current));
  if (hasUI) {
    updateCooldownOverlays();
    updateIntoneUI();
    updateMnemonicUI();
    renderOrbs();
    renderSeasonBanner();
    renderResources();
    refreshMetamorphosis();
    renderXpBar();
  }
}

function showConstructCloud(text, target, color) {
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'construct-cloud';
  el.textContent = text;
  if (color) el.style.color = color;
  const parent = target || container;
  parent.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

export function openWaterRegenPopup() {
  const overlay = createOverlay({ className: 'water-regen-overlay' });
  const box = overlay.box;
  const header = document.createElement('h2');
  header.textContent = 'Water Regeneration';
  box.appendChild(header);

  const info = document.createElement('p');
  info.className = 'water-info';
  info.textContent =
    `Base water regeneration follows a logistic curve that slows as your` +
    ` total water rises. At ${getWaterMidpoint()} water the base rate is half of its` +
    ` ${R_MAX}/s maximum before multipliers.`;
  box.appendChild(info);

  const list = document.createElement('div');
  list.className = 'water-regen-list';

  const ins = sectSystem.resources.water;
  const season = seasons[sectSystem.seasonIndex];
  const baseRateRaw = R_MAX / (1 + Math.exp((ins.current - getWaterMidpoint()) / K));
  const idleCount = 0;
  const idleMult = 1 + idleCount * 0.05;
  const seasonMult = season.multiplier;
  const weatherMult = sectSystem.weather ? sectSystem.weather.multiplier : 1;
  const intoneMult = getIntoneMultiplier();
  const researcherCount = sectSystem.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Research'
  ).length;
  const chanterCount = sectSystem.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Chant'
  ).length;

  const rows = [
    { label: 'Base Rate', value: `${baseRateRaw.toFixed(3)}/s` },
  ];
  if (idleCount > 0) {
    rows.push({ label: `Idle Disciples (${idleCount})`, value: `×${idleMult.toFixed(2)}` });
  }
  rows.push({ label: `Season (${season.name})`, value: `×${seasonMult.toFixed(2)}` });
  if (sectSystem.weather) {
    rows.push({ label: `Weather (${sectSystem.weather.type})`, value: `×${weatherMult.toFixed(2)}` });
  }
  rows.push({ label: 'Intone', value: `×${intoneMult.toFixed(2)}` });
  if (researcherCount > 0) {
    rows.push({
      label: `Research (${researcherCount})`,
      value: `-${(researcherCount * 4).toFixed(3)}/s`
    });
  }
  if (chanterCount > 0) {
    rows.push({
      label: `Chant (${chanterCount})`,
      value: `-${chanterCount.toFixed(3)}/s`
    });
  }

  rows.forEach(r => {
    const row = document.createElement('div');
    const isNeg =
      r.value.startsWith('-') ||
      (r.value.startsWith('×') && parseFloat(r.value.slice(1)) < 1);
    row.className = 'water-row' + (isNeg ? ' negative' : '');
    row.innerHTML = `<span>${r.label}</span><span>${r.value}</span>`;
    list.appendChild(row);
  });

  const totalRow = document.createElement('div');
  totalRow.className = 'water-total';
  totalRow.textContent = `Total: ${sectSystem.gains.water.toFixed(3)}/s`;
  list.appendChild(totalRow);

  box.appendChild(list);
  overlay.appendButton('Close', overlay.close);
}


// placeholder colony functions
export function tickSect() {}

export function renderColonyResources() {}
